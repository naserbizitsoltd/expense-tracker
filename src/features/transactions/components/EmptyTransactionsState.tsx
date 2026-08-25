import { Wallet, Plus, ArrowLeftRight } from 'lucide-react'

interface EmptyTransactionsStateProps {
  onAddExpense: () => void
  onAddIncome: () => void
  onAddTransfer: () => void
}

export function EmptyTransactionsState({ onAddExpense, onAddIncome, onAddTransfer }: EmptyTransactionsStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 px-8 py-20 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/5">
        <Wallet size={28} className="text-white/30" />
      </span>
      <div>
        <p className="text-base font-semibold text-white">No transactions yet</p>
        <p className="mt-1 text-sm text-white/40">
          Record your income and expenses to start understanding your finances.
        </p>
      </div>
      <div className="mt-2 flex items-center gap-3">
        <button
          onClick={onAddIncome}
          className="flex items-center gap-2 rounded-full bg-white/10 px-5 py-2.5 text-sm font-semibold text-white"
        >
          <Plus size={16} />
          Add Income
        </button>
                <button
          onClick={onAddExpense}
          className="flex items-center gap-2 rounded-full bg-emerald-400 px-5 py-2.5 text-sm font-semibold text-black"
        >
          <Plus size={16} />
          Add Expense
        </button>
      </div>
      <button
        onClick={onAddTransfer}
        className="mt-1 flex items-center gap-2 text-sm font-medium text-white/50 active:text-white/70"
      >
        <ArrowLeftRight size={14} />
        Or transfer between accounts
      </button>
    </div>
  )
}