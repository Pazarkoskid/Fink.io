import { useState } from 'react'
import { ChevronDown, HelpCircle, Mail, Upload, Sparkles, Flag } from 'lucide-react'

const FAQS = [
  {
    icon: Upload,
    q: 'Како да прикачам учебен материјал?',
    a: 'Откако ќе се пријавиш како инструктор, оди на „Прикачи материјал" во главното мени. Поддржани формати се PDF, DOC, DOCX, PPT, PPTX и TXT. Максималната големина е 50 MB. Системот автоматски ќе извлече текст од документот.',
  },
  {
    icon: Sparkles,
    q: 'Како AI ги генерира прашањата?',
    a: 'Откако ќе се прикачи материјалот и ќе се извлече текст, можеш да го конфигурираш генераторот: број на прашања, типови (еден точен / повеќе точни / есејско), тежина и инструкции. Fink.io користи Claude AI за да чита и да предлага квалитетни прашања на македонски јазик. По генерирањето, ти ги прегледуваш и уредуваш пред објавување.',
  },
  {
    icon: Flag,
    q: 'Како да пријавам проблем со квиз?',
    a: 'На страницата на секој квиз има копче „Пријави". Ги избираш типот на проблем (грешен одговор, нејасно прашање, навредливо итн.) и опишуваш кратко за што се работи. Модераторите ја разгледуваат пријавата и постапуваат соодветно.',
  },
  {
    q: 'Кои улоги постојат на платформата?',
    a: 'Гостин (без регистрација) може да пребарува и да игра јавни квизови. Студент игра, лајкува и зачувува историја. Инструктор прикачува материјали и создава квизови. Модератор обработува пријави. Администратор управува со целиот систем.',
  },
  {
    q: 'Дали моите квизови ќе бидат јавни?',
    a: 'При објавување, ти избираш дали квизот ќе биде јавен (видлив на сите), приватен (само за тебе) или со скриен линк (видлив само за оние со линкот).',
  },
  {
    q: 'Дали есејските прашања се автоматски бодуваат?',
    a: 'Не. Есејските прашања се прикажуваат како дел од резултатот, но не се бодуваат автоматски. Инструкторот мора рачно да ги прегледа.',
  },
]

export default function Help() {
  const [open, setOpen] = useState(0)

  return (
    <div className="container-app py-12">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <span className="badge mb-4 inline-block">
            <HelpCircle size={10} className="mr-1" /> Поддршка
          </span>
          <h1 className="font-display text-5xl mb-3">Како можеме да помогнеме?</h1>
          <p className="text-fg">
            Најчесто поставувани прашања за работа со Fink.io
          </p>
        </div>

        <div className="space-y-3 mb-12">
          {FAQS.map((faq, i) => {
            const isOpen = open === i
            const Icon = faq.icon
            return (
              <div key={i} className="card !p-0 overflow-hidden">
                <button
                  onClick={() => setOpen(isOpen ? -1 : i)}
                  className="w-full p-5 flex items-center gap-4 text-left hover:bg-surface transition-colors"
                >
                  {Icon && <Icon size={20} className="text-accent shrink-0" />}
                  <span className="flex-1 font-display text-lg">{faq.q}</span>
                  <ChevronDown
                    size={20}
                    className={`shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-fg leading-relaxed">
                    {faq.a}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="card-dark text-white">
          <Mail size={24} className="text-accent mb-3" />
          <h2 className="font-display text-2xl mb-2">Не го најде одговорот?</h2>
          <p className="text-muted mb-4">
            Пиши ни на support@fink.io и ќе ти одговориме во рок од 24 часа.
          </p>
          <a
            href="mailto:support@fink.io"
            className="btn bg-accent border-accent text-white hover:bg-bg hover:text-fg hover:border-cream"
          >
            Контактирај нè
          </a>
        </div>
      </div>
    </div>
  )
}
