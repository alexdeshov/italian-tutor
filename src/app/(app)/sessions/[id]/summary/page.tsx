import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'

type Props = { params: Promise<{ id: string }> }

export default async function SummaryPage({ params }: Props) {
  await params

  return (
    <div className="max-w-md mx-auto py-10 px-4 space-y-4">
      <h1 className="text-xl font-semibold">Итоги сессии</h1>
      <p className="text-muted-foreground text-sm">
        Разбор сессии скоро будет здесь.
      </p>
      <Link href="/profile" className={buttonVariants({ variant: 'outline' })}>
        ← Назад на профиль
      </Link>
    </div>
  )
}
