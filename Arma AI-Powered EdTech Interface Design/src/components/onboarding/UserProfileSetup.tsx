import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';

export interface UserProfileData {
  age: number;
  education_level: 'school' | 'university' | 'professional';
  grade_level?: number;
  school_interests?: string[];
  university_year?: number;
  faculty?: string;
  major?: string;
  occupation?: string;
  work_field?: string;
  learning_style?: 'visual' | 'auditory' | 'reading_writing' | 'kinesthetic';
  interests?: string[];
}

interface UserProfileSetupProps {
  onComplete: (profile: UserProfileData) => void;
  onSkip?: () => void;
}

const GRADES = [
  { value: '1', label: '1 класс' },
  { value: '2', label: '2 класс' },
  { value: '3', label: '3 класс' },
  { value: '4', label: '4 класс' },
  { value: '5', label: '5 класс' },
  { value: '6', label: '6 класс' },
  { value: '7', label: '7 класс' },
  { value: '8', label: '8 класс' },
  { value: '9', label: '9 класс' },
  { value: '10', label: '10 класс' },
  { value: '11', label: '11 класс' },
];

const UNIVERSITY_YEARS = [
  { value: '1', label: '1 курс' },
  { value: '2', label: '2 курс' },
  { value: '3', label: '3 курс' },
  { value: '4', label: '4 курс' },
  { value: '5', label: '5 курс' },
  { value: '6', label: '6 курс' },
  { value: '7', label: '7 курс' },
];

const FACULTIES = [
  { value: 'computer_science', label: 'Компьютерные науки' },
  { value: 'mathematics', label: 'Математика' },
  { value: 'physics', label: 'Физика' },
  { value: 'engineering', label: 'Инженерия' },
  { value: 'medicine', label: 'Медицина' },
  { value: 'biology', label: 'Биология' },
  { value: 'chemistry', label: 'Химия' },
  { value: 'economics', label: 'Экономика' },
  { value: 'business', label: 'Бизнес' },
  { value: 'law', label: 'Право' },
  { value: 'philology', label: 'Филология' },
  { value: 'history', label: 'История' },
  { value: 'psychology', label: 'Психология' },
  { value: 'education', label: 'Педагогика' },
  { value: 'arts', label: 'Искусство' },
  { value: 'other', label: 'Другое' },
];

const LEARNING_STYLES = [
  { value: 'visual', label: 'Визуал', description: 'Лучше воспринимаю информацию через изображения и схемы' },
  { value: 'auditory', label: 'Аудиал', description: 'Предпочитаю слушать лекции и подкасты' },
  { value: 'reading_writing', label: 'Чтение/Письмо', description: 'Люблю читать и конспектировать' },
  { value: 'kinesthetic', label: 'Кинестетик', description: 'Учусь через практику и эксперименты' },
];

const SCHOOL_INTERESTS = [
  'Математика',
  'Физика',
  'Химия',
  'Биология',
  'Информатика',
  'Литература',
  'История',
  'Иностранные языки',
  'Искусство',
];

export const UserProfileSetup: React.FC<UserProfileSetupProps> = ({ onComplete, onSkip }) => {
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState<UserProfileData>({
    age: 0,
    education_level: 'university',
    school_interests: [],
    interests: [],
  });

  const totalSteps = 4;

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      onComplete(profile);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const updateProfile = (updates: Partial<UserProfileData>) => {
    setProfile((prev) => ({ ...prev, ...updates }));
  };

  const toggleInterest = (interest: string, isSchool: boolean = false) => {
    if (isSchool) {
      const current = profile.school_interests || [];
      const updated = current.includes(interest)
        ? current.filter((i) => i !== interest)
        : [...current, interest];
      updateProfile({ school_interests: updated });
    } else {
      const current = profile.interests || [];
      const updated = current.includes(interest)
        ? current.filter((i) => i !== interest)
        : [...current, interest];
      updateProfile({ interests: updated });
    }
  };

  const isStepValid = () => {
    switch (step) {
      case 1:
        return profile.age >= 5 && profile.age <= 100;
      case 2:
        if (profile.age < 18) {
          return !!profile.grade_level;
        }
        return !!profile.education_level;
      case 3:
        // For users < 18, education_level is not set, but they're school students
        if (profile.age < 18 || profile.education_level === 'school') {
          return (profile.school_interests?.length || 0) > 0;
        }
        if (profile.education_level === 'university') {
          return !!profile.faculty;
        }
        // For professional or other, interests are optional
        return true;
      case 4:
        return true; // Learning style is optional
      default:
        return true;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#0C0C0F' }}>
      <Card className="w-full max-w-2xl glass-panel border-white/10">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-white">
            {step === 1 && 'Давайте познакомимся'}
            {step === 2 && 'Расскажите о вашем образовании'}
            {step === 3 && 'Какие области вас интересуют?'}
            {step === 4 && 'Как вы предпочитаете учиться?'}
          </CardTitle>
          <CardDescription className="text-white/60">
            Это поможет нам адаптировать материалы под ваш уровень
          </CardDescription>
          
          <Progress value={(step / totalSteps) * 100} className="mt-4 h-2 bg-white/10" />
        </CardHeader>
        
        <CardContent>
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="age" className="text-white/80">
                    Сколько вам лет?
                  </Label>
                  <Input
                    id="age"
                    type="number"
                    min="5"
                    max="100"
                    value={profile.age || ''}
                    onChange={(e) => updateProfile({ age: parseInt(e.target.value) || 0 })}
                    className="bg-white/5 border-white/10 text-white"
                    placeholder="Введите ваш возраст"
                  />
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                {profile.age < 18 ? (
                  <>
                    <div className="space-y-2">
                      <Label className="text-white/80">В каком классе вы учитесь?</Label>
                      <Select
                        value={profile.grade_level?.toString()}
                        onValueChange={(value) => updateProfile({ grade_level: parseInt(value) })}
                      >
                        <SelectTrigger className="bg-white/5 border-white/10 text-white">
                          <SelectValue placeholder="Выберите класс" />
                        </SelectTrigger>
                        <SelectContent>
                          {GRADES.map((grade) => (
                            <SelectItem key={grade.value} value={grade.value}>
                              {grade.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <p className="text-sm text-white/60">
                      Мы подберём материалы подходящие для вашего уровня
                    </p>
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label className="text-white/80">Вы студент университета?</Label>
                      <Select
                        value={profile.education_level}
                        onValueChange={(value: 'school' | 'university' | 'professional') => 
                          updateProfile({ education_level: value })
                        }
                      >
                        <SelectTrigger className="bg-white/5 border-white/10 text-white">
                          <SelectValue placeholder="Выберите вариант" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="university">Да, я студент университета</SelectItem>
                          <SelectItem value="professional">Нет, я работаю/закончил(а)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {profile.education_level === 'university' && (
                      <>
                        <div className="space-y-2">
                          <Label className="text-white/80">На каком вы курсе?</Label>
                          <Select
                            value={profile.university_year?.toString()}
                            onValueChange={(value) => updateProfile({ university_year: parseInt(value) })}
                          >
                            <SelectTrigger className="bg-white/5 border-white/10 text-white">
                              <SelectValue placeholder="Выберите курс" />
                            </SelectTrigger>
                            <SelectContent>
                              {UNIVERSITY_YEARS.map((year) => (
                                <SelectItem key={year.value} value={year.value}>
                                  {year.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-white/80">Ваш факультет/специальность?</Label>
                          <Select
                            value={profile.faculty}
                            onValueChange={(value) => updateProfile({ faculty: value })}
                          >
                            <SelectTrigger className="bg-white/5 border-white/10 text-white">
                              <SelectValue placeholder="Выберите факультет" />
                            </SelectTrigger>
                            <SelectContent>
                              {FACULTIES.map((faculty) => (
                                <SelectItem key={faculty.value} value={faculty.value}>
                                  {faculty.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </>
                    )}

                    {profile.education_level === 'professional' && (
                      <>
                        <div className="space-y-2">
                          <Label className="text-white/80">Ваше высшее образование</Label>
                          <Select
                            value={profile.faculty}
                            onValueChange={(value) => updateProfile({ faculty: value })}
                          >
                            <SelectTrigger className="bg-white/5 border-white/10 text-white">
                              <SelectValue placeholder="Выберите область" />
                            </SelectTrigger>
                            <SelectContent>
                              {FACULTIES.map((faculty) => (
                                <SelectItem key={faculty.value} value={faculty.value}>
                                  {faculty.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </>
                    )}
                  </>
                )}
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                {/* Show school interests for users < 18 OR education_level = 'school' */}
                {profile.age < 18 || profile.education_level === 'school' ? (
                  <>
                    <Label className="text-white/80">Какие предметы вам интересны?</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {SCHOOL_INTERESTS.map((interest) => (
                        <Button
                          key={interest}
                          type="button"
                          variant={
                            (profile.school_interests || []).includes(interest)
                              ? 'default'
                              : 'outline'
                          }
                          onClick={() => toggleInterest(interest, true)}
                          className={`justify-start cursor-pointer ${
                            (profile.school_interests || []).includes(interest)
                              ? 'bg-[#FF8A3D] hover:bg-[#FF8A3D]/90 text-white'
                              : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                          }`}
                        >
                          {interest}
                        </Button>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <Label className="text-white/80">
                      {profile.education_level === 'university' 
                        ? 'Какие области вы изучаете/интересуют?' 
                        : 'В какой области вы работаете/интересы?'}
                    </Label>
                    <div className="grid grid-cols-2 gap-2">
                      {FACULTIES.map((faculty) => (
                        <Button
                          key={faculty.value}
                          type="button"
                          variant="outline"
                          onClick={() => toggleInterest(faculty.label)}
                          className={`justify-start cursor-pointer ${
                            (profile.interests || []).includes(faculty.label)
                              ? 'bg-[#FF8A3D] hover:bg-[#FF8A3D]/90 text-white'
                              : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                          }`}
                        >
                          {faculty.label}
                        </Button>
                      ))}
                    </div>
                  </>
                )}
              </motion.div>
            )}

            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <Label className="text-white/80">
                  Выберите ваш предпочтительный стиль обучения (необязательно)
                </Label>
                <div className="grid gap-3">
                  {LEARNING_STYLES.map((style) => (
                    <Button
                      key={style.value}
                      type="button"
                      variant="outline"
                      onClick={() => updateProfile({ learning_style: style.value as any })}
                      className={`p-4 h-auto justify-start cursor-pointer ${
                        profile.learning_style === style.value
                          ? 'bg-[#FF8A3D] hover:bg-[#FF8A3D]/90 text-white border-[#FF8A3D]'
                          : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                      }`}
                    >
                      <div className="text-left">
                        <div className="font-medium">{style.label}</div>
                        <div className="text-sm opacity-80">{style.description}</div>
                      </div>
                    </Button>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => updateProfile({ learning_style: undefined })}
                  className={`w-full cursor-pointer ${
                    !profile.learning_style
                      ? 'bg-white/10 text-white'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  Пропустить
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex gap-3 mt-6">
            {step > 1 ? (
              <Button
                type="button"
                onClick={handleBack}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white cursor-pointer"
              >
                Назад
              </Button>
            ) : onSkip ? (
              <Button
                type="button"
                onClick={onSkip}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white cursor-pointer"
              >
                Пропустить
              </Button>
            ) : null}
            
            <Button
              onClick={handleNext}
              disabled={!isStepValid()}
              className="flex-1 bg-[#FF8A3D] hover:bg-[#FF8A3D]/90 text-white font-medium cursor-pointer disabled:opacity-50"
            >
              {step === totalSteps ? 'Завершить' : 'Далее'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
