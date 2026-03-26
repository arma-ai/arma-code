import React, { useState } from 'react';
import { motion } from 'motion/react';
import { GraduationCap, Building2, Briefcase, ChevronRight, Sparkles } from 'lucide-react';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { toast } from 'sonner';
import type { CreateUserProfileRequest, UserType } from '../../types/api';

interface StudentProfileFormProps {
  onComplete: (profile: CreateUserProfileRequest) => void;
  isLoading?: boolean;
}

export function StudentProfileForm({ onComplete, isLoading = false }: StudentProfileFormProps) {
  const [userType, setUserType] = useState<UserType | ''>('');
  const [formData, setFormData] = useState<CreateUserProfileRequest>({
    user_type: 'adult',
    preferred_language: 'ru',
    difficulty_preference: 'medium',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userType) {
      toast.error('Пожалуйста, выберите тип обучения');
      return;
    }

    // Validate based on user type
    if (userType === 'school' && !formData.school_grade) {
      toast.error('Укажите ваш класс');
      return;
    }
    
    if (userType === 'university' && !formData.university_course) {
      toast.error('Укажите ваш курс');
      return;
    }

    onComplete({
      ...formData,
      user_type: userType as UserType,
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#0C0C0F' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4">
            <Sparkles size={16} className="text-primary" />
            <span className="text-xs font-bold text-primary uppercase tracking-wider">Настройка профиля</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
            Расскажите немного о себе
          </h1>
          <p className="text-white/60 text-lg">
            Это поможет нам адаптировать материалы под ваш уровень
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-[#121215] border border-white/[0.08] rounded-3xl p-6 md:p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* User Type Selection */}
            <div>
              <Label className="text-white/80 text-sm font-medium mb-4 block">
                Кто вы?
              </Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* School */}
                <button
                  type="button"
                  onClick={() => {
                    setUserType('school');
                    setFormData({ ...formData, user_type: 'school' });
                  }}
                  className={`p-6 rounded-2xl border-2 transition-all text-left ${
                    userType === 'school'
                      ? 'bg-primary/10 border-primary'
                      : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-white/20'
                  }`}
                >
                  <GraduationCap size={32} className={`mb-3 ${userType === 'school' ? 'text-primary' : 'text-white/40'}`} />
                  <div className={`font-bold mb-1 ${userType === 'school' ? 'text-white' : 'text-white/70'}`}>Школьник</div>
                  <div className="text-xs text-white/40">5-11 класс</div>
                </button>

                {/* University */}
                <button
                  type="button"
                  onClick={() => {
                    setUserType('university');
                    setFormData({ ...formData, user_type: 'university' });
                  }}
                  className={`p-6 rounded-2xl border-2 transition-all text-left ${
                    userType === 'university'
                      ? 'bg-primary/10 border-primary'
                      : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-white/20'
                  }`}
                >
                  <Building2 size={32} className={`mb-3 ${userType === 'university' ? 'text-primary' : 'text-white/40'}`} />
                  <div className={`font-bold mb-1 ${userType === 'university' ? 'text-white' : 'text-white/70'}`}>Студент</div>
                  <div className="text-xs text-white/40">ВУЗ, колледж</div>
                </button>

                {/* Adult */}
                <button
                  type="button"
                  onClick={() => {
                    setUserType('adult');
                    setFormData({ ...formData, user_type: 'adult' });
                  }}
                  className={`p-6 rounded-2xl border-2 transition-all text-left ${
                    userType === 'adult'
                      ? 'bg-primary/10 border-primary'
                      : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-white/20'
                  }`}
                >
                  <Briefcase size={32} className={`mb-3 ${userType === 'adult' ? 'text-primary' : 'text-white/40'}`} />
                  <div className={`font-bold mb-1 ${userType === 'adult' ? 'text-white' : 'text-white/70'}`}>Взрослый</div>
                  <div className="text-xs text-white/40">Самостоятельное изучение</div>
                </button>
              </div>
            </div>

            {/* Conditional Fields */}
            {userType === 'school' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-4"
              >
                <div>
                  <Label htmlFor="school_grade" className="text-white/80 text-sm font-medium">
                    В каком классе вы учитесь?
                  </Label>
                  <Input
                    id="school_grade"
                    type="number"
                    min="1"
                    max="11"
                    value={formData.school_grade || ''}
                    onChange={(e) => setFormData({ ...formData, school_grade: parseInt(e.target.value) || undefined })}
                    className="mt-2 bg-white/5 border-white/10 text-white"
                    placeholder="10"
                  />
                </div>

                <div>
                  <Label htmlFor="age_school" className="text-white/80 text-sm font-medium">
                    Ваш возраст
                  </Label>
                  <Input
                    id="age_school"
                    type="number"
                    min="10"
                    max="100"
                    value={formData.age || ''}
                    onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) || undefined })}
                    className="mt-2 bg-white/5 border-white/10 text-white"
                    placeholder="16"
                  />
                </div>
              </motion.div>
            )}

            {userType === 'university' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-4"
              >
                <div>
                  <Label htmlFor="university_course" className="text-white/80 text-sm font-medium">
                    На каком курсе вы учитесь?
                  </Label>
                  <Input
                    id="university_course"
                    type="number"
                    min="1"
                    max="6"
                    value={formData.university_course || ''}
                    onChange={(e) => setFormData({ ...formData, university_course: parseInt(e.target.value) || undefined })}
                    className="mt-2 bg-white/5 border-white/10 text-white"
                    placeholder="3"
                  />
                </div>

                <div>
                  <Label htmlFor="university_faculty" className="text-white/80 text-sm font-medium">
                    Факультет / специальность
                  </Label>
                  <Input
                    id="university_faculty"
                    type="text"
                    value={formData.university_faculty || ''}
                    onChange={(e) => setFormData({ ...formData, university_faculty: e.target.value || undefined })}
                    className="mt-2 bg-white/5 border-white/10 text-white"
                    placeholder="Компьютерные науки"
                  />
                </div>

                <div>
                  <Label htmlFor="age_uni" className="text-white/80 text-sm font-medium">
                    Ваш возраст
                  </Label>
                  <Input
                    id="age_uni"
                    type="number"
                    min="10"
                    max="100"
                    value={formData.age || ''}
                    onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) || undefined })}
                    className="mt-2 bg-white/5 border-white/10 text-white"
                    placeholder="20"
                  />
                </div>
              </motion.div>
            )}

            {userType === 'adult' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-4"
              >
                <div>
                  <Label htmlFor="profession" className="text-white/80 text-sm font-medium">
                    Ваша профессия (необязательно)
                  </Label>
                  <Input
                    id="profession"
                    type="text"
                    value={formData.profession || ''}
                    onChange={(e) => setFormData({ ...formData, profession: e.target.value || undefined })}
                    className="mt-2 bg-white/5 border-white/10 text-white"
                    placeholder="Разработчик"
                  />
                </div>

                <div>
                  <Label htmlFor="learning_goal" className="text-white/80 text-sm font-medium">
                    Цель обучения
                  </Label>
                  <Input
                    id="learning_goal"
                    type="text"
                    value={formData.learning_goal || ''}
                    onChange={(e) => setFormData({ ...formData, learning_goal: e.target.value || undefined })}
                    className="mt-2 bg-white/5 border-white/10 text-white"
                    placeholder="Повышение квалификации"
                  />
                </div>

                <div>
                  <Label htmlFor="age_adult" className="text-white/80 text-sm font-medium">
                    Ваш возраст
                  </Label>
                  <Input
                    id="age_adult"
                    type="number"
                    min="10"
                    max="100"
                    value={formData.age || ''}
                    onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) || undefined })}
                    className="mt-2 bg-white/5 border-white/10 text-white"
                    placeholder="25"
                  />
                </div>
              </motion.div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoading || !userType}
              className="w-full py-4 bg-primary text-black rounded-xl font-bold text-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? 'Сохранение...' : 'Продолжить'}
              {!isLoading && <ChevronRight size={20} />}
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
