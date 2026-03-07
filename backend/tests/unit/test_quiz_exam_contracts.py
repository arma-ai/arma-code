import os
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest

# Stabilize settings loading in local test environments.
os.environ["DEBUG"] = "True"
os.environ.setdefault("APP_ENV", "development")

from app.api.v1.endpoints.quiz import (
    _fallback_explanation,
    get_exam_quiz_questions,
    submit_quiz_attempt,
)
from app.domain.services.material_processing_service import MaterialProcessingService
from app.domain.services.quiz_service import QuizService
from app.infrastructure.database.models.quiz import QuizQuestion
from app.schemas.quiz import (
    QuizAnswerRequest,
    QuizAnswerResponse,
    QuizAttemptAnswerDetail,
    QuizAttemptRequest,
    QuizAttemptSaveRequest,
    QuizListResponse,
)


def test_fallback_explanation_uses_saved_text() -> None:
    question = QuizQuestion(
        question="Q",
        option_a="A",
        option_b="B",
        option_c="C",
        option_d="D",
        correct_option="B",
        explanation="Because B matches the definition.",
    )

    assert _fallback_explanation(question) == "Because B matches the definition."


def test_fallback_explanation_uses_default_when_missing() -> None:
    question = QuizQuestion(
        question="Q",
        option_a="A",
        option_b="B",
        option_c="C",
        option_d="D",
        correct_option="B",
        explanation=None,
    )

    assert _fallback_explanation(question) == "Correct answer: B"


def test_quiz_answer_response_requires_explanation_fields() -> None:
    response = QuizAnswerResponse(
        question_id="123e4567-e89b-12d3-a456-426614174000",
        question_text="What is Python?",
        is_correct=True,
        correct_option="A programming language",
        selected_option="A programming language",
        explanation="Python is used to write software.",
    )

    assert response.question_text == "What is Python?"
    assert response.explanation == "Python is used to write software."


def test_attempt_detail_allows_optional_explanation() -> None:
    detail = QuizAttemptAnswerDetail(
        question_id="123e4567-e89b-12d3-a456-426614174000",
        selected="A programming language",
        correct=True,
        correct_option="A programming language",
    )

    assert detail.explanation is None


@pytest.mark.asyncio
async def test_exam_endpoint_hides_correct_answer_fields() -> None:
    mock_db = AsyncMock()
    current_user = MagicMock()
    material_id = uuid4()

    question = QuizQuestion(
        id=uuid4(),
        material_id=material_id,
        question="What is 2+2?",
        option_a="3",
        option_b="4",
        option_c="5",
        option_d="6",
        correct_option="4",
        explanation="2+2 equals 4.",
        created_at=datetime.now(timezone.utc),
    )

    questions_result = MagicMock()
    questions_result.scalars.return_value.all.return_value = [question]
    count_result = MagicMock()
    count_result.scalar.return_value = 1
    mock_db.execute = AsyncMock(side_effect=[questions_result, count_result])

    with patch(
        "app.api.v1.endpoints.quiz.verify_material_owner",
        new=AsyncMock(return_value=None),
    ):
        response = await get_exam_quiz_questions(
            material_id=material_id,
            db=mock_db,
            current_user=current_user,
        )

    payload = QuizListResponse.model_validate(response).model_dump(mode="json")
    assert payload["total"] == 1
    assert len(payload["questions"]) == 1
    assert "correct_option" not in payload["questions"][0]
    assert "explanation" not in payload["questions"][0]


@pytest.mark.asyncio
async def test_quiz_attempt_uses_fallback_explanation_for_legacy_questions() -> None:
    mock_db = AsyncMock()
    current_user = MagicMock()
    material_id = uuid4()
    question_id = uuid4()

    question = QuizQuestion(
        id=question_id,
        material_id=material_id,
        question="Legacy question?",
        option_a="A",
        option_b="B",
        option_c="C",
        option_d="D",
        correct_option="B",
        explanation=None,
        created_at=datetime.now(timezone.utc),
    )

    question_result = MagicMock()
    question_result.scalar_one_or_none.return_value = question
    mock_db.execute = AsyncMock(return_value=question_result)

    with patch(
        "app.api.v1.endpoints.quiz.verify_material_owner",
        new=AsyncMock(return_value=None),
    ):
        payload = await submit_quiz_attempt(
            attempt_data=QuizAttemptRequest(
                answers=[
                    QuizAnswerRequest(
                        question_id=question_id,
                        selected_option="A",
                    )
                ]
            ),
            db=mock_db,
            current_user=current_user,
        )

    assert payload["total_questions"] == 1
    assert payload["correct_answers"] == 0
    assert payload["results"][0]["question_text"] == "Legacy question?"
    assert payload["results"][0]["explanation"] == "Correct answer: B"


@pytest.mark.asyncio
async def test_save_attempt_keeps_answer_explanation() -> None:
    session = AsyncMock()
    service = QuizService(session)

    user_id = uuid4()
    material_id = uuid4()
    now = datetime.now(timezone.utc)

    service.repository.create = AsyncMock(
        return_value={
            "id": uuid4(),
            "user_id": user_id,
            "material_id": material_id,
            "score": 1,
            "total_questions": 1,
            "percentage": 100,
            "completed_at": now,
            "created_at": now,
            "answers": [
                {
                    "question_id": str(uuid4()),
                    "selected": "A",
                    "correct": True,
                    "correct_option": "A",
                    "explanation": "Because A is right.",
                }
            ],
        }
    )

    request = QuizAttemptSaveRequest(
        material_id=material_id,
        score=1,
        total_questions=1,
        percentage=100,
        answers=[
            QuizAttemptAnswerDetail(
                question_id=uuid4(),
                selected="A",
                correct=True,
                correct_option="A",
                explanation="Because A is right.",
            )
        ],
    )

    await service.save_quiz_attempt(user_id, request)

    called_args = service.repository.create.await_args.kwargs
    assert called_args["answers"][0]["explanation"] == "Because A is right."


@pytest.mark.asyncio
async def test_save_quiz_replaces_existing_questions() -> None:
    session = MagicMock()
    session.execute = AsyncMock()
    session.commit = AsyncMock()
    session.add = MagicMock()

    service = MaterialProcessingService(session)
    material_id = uuid4()

    await service._save_quiz(
        material_id,
        [
            {
                "question": "Q1",
                "option_a": "A",
                "option_b": "B",
                "option_c": "C",
                "option_d": "D",
                "correct_option": "A",
                "explanation": "Because A.",
            }
        ],
    )

    delete_query = session.execute.await_args_list[0].args[0]
    assert "DELETE FROM quiz_questions" in str(delete_query)
    assert session.add.call_count == 1
    assert session.commit.await_count == 1
