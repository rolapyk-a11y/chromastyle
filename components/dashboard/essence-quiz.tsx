'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { StyleEssence, ESSENCE_INFO } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, ChevronLeft, ChevronRight, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import Image from 'next/image'

type EssenceScores = Record<StyleEssence, number>

interface QuizOption {
  label: string
  description: string
  image: string   // Unsplash URL
  scores: Partial<EssenceScores>
}

interface QuizQuestion {
  question: string
  subtitle?: string
  options: QuizOption[]
}

const U = (id: string, crop = 'faces') =>
  `https://images.unsplash.com/photo-${id}?w=400&h=300&fit=crop&crop=${crop}`

const QUESTIONS: QuizQuestion[] = [
  {
    question: 'How would you describe your body frame?',
    subtitle: 'Think about your natural build, not your weight.',
    options: [
      {
        label: 'Long & angular',
        description: 'Tall, straight, with sharp shoulders',
        image: U('1487222477-5f7ac8e5b5b8', 'top'),
        scores: { dramatic: 3, angelic: 1 },
      },
      {
        label: 'Compact & boyish',
        description: 'Shorter, trim, with a youthful energy',
        image: U('1463453091185-61582044d556', 'faces'),
        scores: { gamine: 3, ingenue: 1 },
      },
      {
        label: 'Athletic & sturdy',
        description: 'Broad shoulders, strong build',
        image: U('1534367610401-9f5ed68180aa', 'top'),
        scores: { natural: 3, classic: 1 },
      },
      {
        label: 'Balanced & proportional',
        description: 'Even, symmetrical, neither extreme',
        image: U('1507003211169-0a1dd7228f2d', 'faces'),
        scores: { classic: 3, romantic: 1 },
      },
      {
        label: 'Slim & delicate',
        description: 'Lean, fine-boned, lightweight',
        image: U('1472099645785-5658abf4ff4e', 'top'),
        scores: { angelic: 3, ingenue: 1 },
      },
      {
        label: 'Soft & rounded',
        description: 'Fuller features, softer angles',
        image: U('1500648767791-00dcc994a43e', 'faces'),
        scores: { romantic: 3, ingenue: 1 },
      },
    ],
  },
  {
    question: 'How tall are you?',
    options: [
      {
        label: 'Tall (185cm+)',
        description: 'Above average height',
        image: U('1555952517-2e8e729e0960', 'top'),
        scores: { dramatic: 2, angelic: 2 },
      },
      {
        label: 'Average (170–185cm)',
        description: 'Middle range',
        image: U('1570295999919-56ceb5ecca61', 'faces'),
        scores: { classic: 2, natural: 1, romantic: 1 },
      },
      {
        label: 'Shorter (under 170cm)',
        description: 'Below average height',
        image: U('1506794778202-cad84cf45f1d', 'faces'),
        scores: { gamine: 3, ingenue: 2 },
      },
    ],
  },
  {
    question: 'How would you describe your face?',
    options: [
      {
        label: 'Sharp & defined',
        description: 'Strong jaw, angular features, striking',
        image: U('1583195764036-6dc248ac07d9', 'faces'),
        scores: { dramatic: 3, gamine: 1 },
      },
      {
        label: 'Boyish & youthful',
        description: 'Fresh-faced, energetic, fun',
        image: U('1463453091185-61582044d556', 'faces'),
        scores: { gamine: 3, ingenue: 1 },
      },
      {
        label: 'Open & broad',
        description: 'Wide face, approachable, friendly',
        image: U('1521119989659-3d20a2e6c7f6', 'faces'),
        scores: { natural: 3, classic: 1 },
      },
      {
        label: 'Symmetrical & balanced',
        description: 'Even features, neither hard nor soft',
        image: U('1507003211169-0a1dd7228f2d', 'faces'),
        scores: { classic: 3, romantic: 1 },
      },
      {
        label: 'Oval & delicate',
        description: 'Fine features, almost ethereal quality',
        image: U('1519058082700-08a9b54f60b7', 'faces'),
        scores: { angelic: 3, ingenue: 1 },
      },
      {
        label: 'Soft & full',
        description: 'Rounded features, gentle and warm',
        image: U('1500648767791-00dcc994a43e', 'faces'),
        scores: { romantic: 2, ingenue: 2 },
      },
    ],
  },
  {
    question: 'What vibe do people naturally pick up from you?',
    subtitle: 'Think about first impressions.',
    options: [
      {
        label: 'Intense & powerful',
        description: 'People find you striking or magnetic',
        image: U('1507680434567-4d82a7d0c88c', 'center'),
        scores: { dramatic: 3 },
      },
      {
        label: 'Playful & rebellious',
        description: 'People find you fun and a bit edgy',
        image: U('1551698618-1dffe2d18f6d', 'center'),
        scores: { gamine: 3 },
      },
      {
        label: 'Laid-back & outdoorsy',
        description: 'People find you easy-going and natural',
        image: U('1476234251399-d1f8e18cd2e9', 'center'),
        scores: { natural: 3 },
      },
      {
        label: 'Polished & reliable',
        description: 'People find you put-together and trustworthy',
        image: U('1593030761757-71fae45fa0e7', 'center'),
        scores: { classic: 3 },
      },
      {
        label: 'Charismatic & magnetic',
        description: 'People find you sensual and captivating',
        image: U('1617127365659-c47fa864d8bc', 'center'),
        scores: { romantic: 3 },
      },
      {
        label: 'Warm & approachable',
        description: 'People find you gentle and kind',
        image: U('1598033129183-c4f50c736f10', 'center'),
        scores: { ingenue: 3 },
      },
      {
        label: 'Mysterious & artistic',
        description: 'People find you unique and otherworldly',
        image: U('1614975059251-992f11792b9f', 'center'),
        scores: { angelic: 3 },
      },
    ],
  },
  {
    question: 'Which style feels most naturally like you?',
    subtitle: 'Not what you think you should wear — what you actually gravitate towards.',
    options: [
      {
        label: 'Bold & theatrical',
        description: 'Oversized coats, strong silhouettes, monochrome',
        image: U('1490481651871-ab68de25d43d', 'center'),
        scores: { dramatic: 3 },
      },
      {
        label: 'Eclectic & streetwear',
        description: 'Pattern mixing, cropped fits, unexpected combos',
        image: U('1548036161-761a9f0d8ed4', 'center'),
        scores: { gamine: 3 },
      },
      {
        label: 'Relaxed & earthy',
        description: 'Layers, natural fabrics, outdoor-ready',
        image: U('1523381210434-271e8be8a52f', 'center'),
        scores: { natural: 3 },
      },
      {
        label: 'Clean & tailored',
        description: 'Timeless pieces, quality basics, neutral palette',
        image: U('1507679799987-c73779587ccf', 'center'),
        scores: { classic: 3 },
      },
      {
        label: 'Luxurious & fitted',
        description: 'Rich textures, premium fabrics, close fit',
        image: U('1583743814966-8d4eb8a38a17', 'center'),
        scores: { romantic: 3 },
      },
      {
        label: 'Soft & delicate',
        description: 'Light colours, subtle details, gentle pieces',
        image: U('1434389677669-e08b4cac3105', 'center'),
        scores: { ingenue: 3 },
      },
      {
        label: 'Flowing & minimal',
        description: 'Draped pieces, fine textures, artistic cuts',
        image: U('1591047139829-d91aecb6caea', 'center'),
        scores: { angelic: 3 },
      },
    ],
  },
]

function calculateEssence(answers: number[]): StyleEssence {
  const scores: EssenceScores = {
    dramatic: 0, gamine: 0, natural: 0,
    classic: 0, romantic: 0, ingenue: 0, angelic: 0,
  }
  answers.forEach((answerIndex, questionIndex) => {
    const option = QUESTIONS[questionIndex].options[answerIndex]
    Object.entries(option.scores).forEach(([essence, score]) => {
      scores[essence as StyleEssence] += score ?? 0
    })
  })
  return Object.entries(scores).sort(([, a], [, b]) => b - a)[0][0] as StyleEssence
}

interface EssenceQuizProps {
  existingEssence?: StyleEssence | null
}

export function EssenceQuiz({ existingEssence }: EssenceQuizProps) {
  const router = useRouter()
  const [step, setStep] = useState<'intro' | 'quiz' | 'result'>('intro')
  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers] = useState<number[]>([])
  const [selected, setSelected] = useState<number | null>(null)
  const [result, setResult] = useState<StyleEssence | null>(existingEssence ?? null)
  const [isSaving, setIsSaving] = useState(false)

  const question = QUESTIONS[currentQ]
  const progress = (currentQ / QUESTIONS.length) * 100

  const handleNext = async () => {
    if (selected === null) return
    const newAnswers = [...answers, selected]

    if (currentQ < QUESTIONS.length - 1) {
      setAnswers(newAnswers)
      setSelected(null)
      setCurrentQ(q => q + 1)
    } else {
      const essence = calculateEssence(newAnswers)
      setResult(essence)
      setStep('result')
      setIsSaving(true)
      await fetch('/api/essence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ essence }),
      })
      setIsSaving(false)
      router.refresh()
    }
  }

  const handleBack = () => {
    if (currentQ === 0) {
      setStep('intro')
    } else {
      setAnswers(a => a.slice(0, -1))
      setSelected(answers[currentQ - 1] ?? null)
      setCurrentQ(q => q - 1)
    }
  }

  const startQuiz = () => {
    setStep('quiz')
    setCurrentQ(0)
    setAnswers([])
    setSelected(null)
    setResult(null)
  }

  // ── INTRO ──────────────────────────────────────────────────────────
  if (step === 'intro') {
    return (
      <div className="max-w-2xl mx-auto space-y-8 text-center">
        <div>
          <p className="text-6xl mb-4">🧬</p>
          <h1 className="text-3xl font-bold tracking-tight mb-3">Discover your Style Essence</h1>
          <p className="text-muted-foreground text-lg">
            The 7 style essences go beyond colour — they reveal the silhouettes, textures and vibes that are naturally aligned with your physical features and personality.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-left">
          {(Object.entries(ESSENCE_INFO) as [StyleEssence, typeof ESSENCE_INFO[StyleEssence]][]).map(([key, info]) => (
            <div key={key} className="flex items-center gap-3 p-3 rounded-lg border border-border/50">
              <div className={`w-8 h-8 rounded-full bg-gradient-to-r ${info.gradient} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                {info.name[0]}
              </div>
              <div>
                <p className="font-medium text-sm">{info.name}</p>
                <p className="text-xs text-muted-foreground">{info.tagline.split(' · ')[0]}</p>
              </div>
            </div>
          ))}
        </div>

        {existingEssence && result && (
          <Card className={`border-0 bg-gradient-to-r ${ESSENCE_INFO[result].gradient} text-white`}>
            <CardContent className="p-4">
              <p className="text-sm opacity-80 mb-1">Your current essence</p>
              <p className="text-xl font-bold">{ESSENCE_INFO[result].name}</p>
              <p className="text-sm opacity-80">{ESSENCE_INFO[result].tagline}</p>
            </CardContent>
          </Card>
        )}

        <Button size="lg" onClick={startQuiz} className="gap-2">
          {existingEssence ? 'Retake the quiz' : 'Start the quiz'} →
        </Button>
        <p className="text-sm text-muted-foreground">5 questions · takes about 1 minute</p>
      </div>
    )
  }

  // ── RESULT ─────────────────────────────────────────────────────────
  if (step === 'result' && result) {
    const info = ESSENCE_INFO[result]
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className={`rounded-2xl bg-gradient-to-br ${info.gradient} p-8 text-white text-center`}>
          <p className="text-5xl mb-4">{info.emoji}</p>
          <p className="text-sm uppercase tracking-widest opacity-80 mb-1">Your Style Essence</p>
          <h1 className="text-4xl font-bold mb-2">{info.name}</h1>
          <p className="opacity-90">{info.tagline}</p>
        </div>

        <Card className="border-border/50">
          <CardContent className="p-6 space-y-4">
            <p className="text-muted-foreground leading-relaxed">{info.description}</p>
            <div>
              <p className="text-sm font-medium mb-2">Your style keywords</p>
              <div className="flex flex-wrap gap-2">
                {info.keywords.map(k => (
                  <span key={k} className="px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-sm">{k}</span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {isSaving && (
          <p className="text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Saving your essence...
          </p>
        )}

        <div className="flex gap-3">
          <Button variant="outline" onClick={startQuiz} className="flex-1">Retake quiz</Button>
          <Button onClick={() => router.push('/dashboard/wardrobe')} className="flex-1">Go to wardrobe →</Button>
        </div>
      </div>
    )
  }

  // ── QUIZ ───────────────────────────────────────────────────────────
  const cols = question.options.length <= 3 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-2 sm:grid-cols-3'

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Question {currentQ + 1} of {QUESTIONS.length}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight mb-1">{question.question}</h2>
        {question.subtitle && <p className="text-muted-foreground">{question.subtitle}</p>}
      </div>

      {/* Options with images */}
      <div className={`grid ${cols} gap-3`}>
        {question.options.map((option, i) => (
          <button
            key={i}
            onClick={() => setSelected(i)}
            className={cn(
              'text-left rounded-xl border-2 overflow-hidden transition-all duration-150 group',
              selected === i
                ? 'border-primary shadow-md shadow-primary/20'
                : 'border-border hover:border-primary/40'
            )}
          >
            {/* Image */}
            <div className="relative w-full aspect-[4/3] overflow-hidden bg-secondary">
              <Image
                src={option.image}
                alt={option.label}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                sizes="(max-width: 640px) 50vw, 33vw"
              />
              {selected === i && (
                <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-lg">
                    <Check className="w-4 h-4 text-primary-foreground" />
                  </div>
                </div>
              )}
            </div>

            {/* Text */}
            <div className="p-3">
              <p className="font-medium text-sm mb-0.5">{option.label}</p>
              <p className="text-xs text-muted-foreground leading-snug">{option.description}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Navigation */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={handleBack} className="gap-1">
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>
        <Button onClick={handleNext} disabled={selected === null} className="flex-1 gap-1">
          {currentQ === QUESTIONS.length - 1 ? 'See my essence' : 'Next'}
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
