import { useState, useMemo } from 'react'
import { Layout } from '../components/Layout'
import { useEntries } from '../hooks/useEntries'
import { useEmployees } from '../hooks/useEmployees'

export function SalarySheet() {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })

  const { employees } = useEmployees()
  const monthEnd = useMemo(() => {
    const [y, m] = selectedMonth.split('-').map(Number)
    return new Date(y, m, 0).toISOString().slice(0, 10)
  }, [selectedMonth])
  const { entries } = useEntries({
    startDate: `${selectedMonth}-01`,
    endDate: monthEnd,
  })

  const monthOptions = useMemo(() => {
    const options = []
    const now = new Date()
    const limit = 12
    for (let i = 0; i < limit; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
      options.push({ value: val, label })
    }
    return options
  }, [])

  const salaryData = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number)
    const monthStart = new Date(year, month - 1, 1).toISOString().slice(0, 10)
    const monthEnd = new Date(year, month, 0).toISOString().slice(0, 10)

    return employees.map((emp) => {
      const advances = entries
        .filter(
          (e) =>
            e.header === 'Advance' &&
            e.employee_id === emp.id &&
            e.entry_date >= monthStart &&
            e.entry_date <= monthEnd
        )
        .reduce((s, e) => s + Number(e.amount), 0)
      return {
        ...emp,
        advances,
        balance: emp.monthly_salary - advances,
      }
    })
  }, [employees, entries, selectedMonth])

  const sortedData = useMemo(() => {
    return [...salaryData].sort(
      (a, b) =>
        (a.location || '').localeCompare(b.location || '') || (a.name || '').localeCompare(b.name || '')
    )
  }, [salaryData])

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-4">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full max-w-xs px-4 py-2 rounded-lg border border-gray-300"
          >
            {monthOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Employee</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Location</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Salary</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Advances</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Balance</th>
                </tr>
              </thead>
              <tbody>
                {sortedData.map((row) => (
                  <tr key={row.id} className="border-b border-gray-100">
                    <td className="px-4 py-3">{row.name}</td>
                    <td className="px-4 py-3">{row.location}</td>
                    <td className="px-4 py-3 text-right">₹{row.monthly_salary?.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 text-right">₹{row.advances.toLocaleString('en-IN')}</td>
                    <td
                      className={`px-4 py-3 text-right font-medium ${
                        row.balance < 0 ? 'text-red-600' : 'text-green-600'
                      }`}
                    >
                      ₹{row.balance.toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  )
}
