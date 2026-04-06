'use client'

import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Users, Settings2, Cake, Briefcase, X } from 'lucide-react'
import { Button } from '@/src/components/ui/Button'
import { Input } from '@/src/components/ui/Input'
import apiClient from '@/src/lib/api'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Employee {
  id: string
  name: string
  email: string | null
  department: string | null
  birthday: string | null
  hireDate: string | null
  active: boolean
}

interface MilestoneConfig {
  birthdayEnabled: boolean
  anniversaryEnabled: boolean
  daysAhead: number
  autoActivate: boolean
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function toDateInputValue(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toISOString().slice(0, 10)
}

// ── Add/Edit Modal ────────────────────────────────────────────────────────────

function EmployeeModal({
  employee,
  onClose,
  onSave,
}: {
  employee: Employee | null
  onClose: () => void
  onSave: (data: Partial<Employee>) => Promise<void>
}) {
  const [form, setForm] = useState({
    name: employee?.name ?? '',
    email: employee?.email ?? '',
    department: employee?.department ?? '',
    birthday: toDateInputValue(employee?.birthday ?? null),
    hireDate: toDateInputValue(employee?.hireDate ?? null),
    active: employee?.active ?? true,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      await onSave({
        name: form.name,
        email: form.email || undefined,
        department: form.department || undefined,
        birthday: form.birthday ? new Date(form.birthday).toISOString() : null,
        hireDate: form.hireDate ? new Date(form.hireDate).toISOString() : null,
        active: form.active,
      })
      onClose()
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Failed to save employee.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            {employee ? 'Edit Employee' : 'Add Employee'}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Full Name"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <Input
            label="Department"
            value={form.department}
            onChange={(e) => setForm({ ...form, department: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Birthday
              </label>
              <input
                type="date"
                value={form.birthday}
                onChange={(e) => setForm({ ...form, birthday: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Hire Date
              </label>
              <input
                type="date"
                value={form.hireDate}
                onChange={(e) => setForm({ ...form, hireDate: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300 text-indigo-600"
            />
            <span className="text-sm font-medium text-gray-700">Active employee</span>
          </label>

          <div className="flex gap-3 pt-2">
            <Button type="submit" variant="primary" isLoading={saving} className="flex-1">
              {employee ? 'Save Changes' : 'Add Employee'}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function EmployeesPage() {
  const qc = useQueryClient()
  const [modalEmployee, setModalEmployee] = useState<Employee | null | 'new'>('new' as any)
  const [showModal, setShowModal] = useState(false)
  const [activeTab, setActiveTab] = useState<'people' | 'settings'>('people')
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // Fetch employees
  const { data: empData, isLoading: empLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const res = await apiClient.get('/v1/employees')
      return res.data.data.employees as Employee[]
    },
  })

  // Fetch milestone config
  const { data: configData } = useQuery({
    queryKey: ['milestone-config'],
    queryFn: async () => {
      const res = await apiClient.get('/v1/milestones/config')
      return res.data.data as MilestoneConfig
    },
  })

  // Create employee
  const createMutation = useMutation({
    mutationFn: (data: Partial<Employee>) => apiClient.post('/v1/employees', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employees'] }),
  })

  // Update employee
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Employee> }) =>
      apiClient.patch(`/v1/employees/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employees'] }),
  })

  // Delete employee
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/v1/employees/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employees'] }),
    onError: (err: any) =>
      setDeleteError(err?.response?.data?.error?.message || 'Failed to delete.'),
  })

  // Update config
  const configMutation = useMutation({
    mutationFn: (data: Partial<MilestoneConfig>) =>
      apiClient.patch('/v1/milestones/config', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['milestone-config'] }),
  })

  const employees = empData ?? []
  const config = configData

  const handleSave = async (data: Partial<Employee>) => {
    if (modalEmployee && modalEmployee !== 'new' && (modalEmployee as Employee).id) {
      await updateMutation.mutateAsync({ id: (modalEmployee as Employee).id, data })
    } else {
      await createMutation.mutateAsync(data)
    }
  }

  const openAdd = () => {
    setModalEmployee(null)
    setShowModal(true)
  }

  const openEdit = (emp: Employee) => {
    setModalEmployee(emp)
    setShowModal(true)
  }

  return (
    <div className="section-container">
      {showModal && (
        <EmployeeModal
          employee={modalEmployee as Employee | null}
          onClose={() => setShowModal(false)}
          onSave={handleSave}
        />
      )}

      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Employees</h1>
          <p className="mt-1 text-gray-500">
            Manage your team and automate milestone recognition boards.
          </p>
        </div>
        <Button variant="primary" icon={<Plus size={18} />} onClick={openAdd}>
          Add Employee
        </Button>
      </div>

      {/* Tabs */}
      <div className="mb-8 flex gap-1 rounded-lg border border-gray-200 bg-gray-100 p-1 w-fit">
        <button
          onClick={() => setActiveTab('people')}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'people'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Users size={16} />
          People ({employees.length})
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'settings'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Settings2 size={16} />
          Automation Settings
        </button>
      </div>

      {deleteError && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {deleteError}
        </div>
      )}

      {/* People tab */}
      {activeTab === 'people' && (
        <div className="card overflow-hidden">
          {empLoading && (
            <div className="space-y-3 p-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-14 animate-pulse rounded-lg bg-gray-100" />
              ))}
            </div>
          )}

          {!empLoading && employees.length === 0 && (
            <div className="py-16 text-center">
              <Users size={40} className="mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500">No employees yet.</p>
              <p className="mt-1 text-sm text-gray-400">
                Add your team to enable milestone automation.
              </p>
              <Button variant="primary" className="mt-6" icon={<Plus size={16} />} onClick={openAdd}>
                Add First Employee
              </Button>
            </div>
          )}

          {!empLoading && employees.length > 0 && (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-gray-600">Name</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-600">Department</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">
                    <span className="flex items-center gap-1">
                      <Cake size={14} /> Birthday
                    </span>
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">
                    <span className="flex items-center gap-1">
                      <Briefcase size={14} /> Hire Date
                    </span>
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{emp.name}</p>
                        {emp.email && (
                          <p className="text-xs text-gray-500">{emp.email}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{emp.department || '—'}</td>
                    <td className="px-4 py-4 text-gray-600">{formatDate(emp.birthday)}</td>
                    <td className="px-4 py-4 text-gray-600">{formatDate(emp.hireDate)}</td>
                    <td className="px-4 py-4">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          emp.active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {emp.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(emp)}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                          title="Edit"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Remove ${emp.name}?`)) {
                              deleteMutation.mutate(emp.id)
                            }
                          }}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Settings tab */}
      {activeTab === 'settings' && config && (
        <div className="max-w-lg space-y-6">
          <div className="card p-6">
            <h2 className="mb-1 text-lg font-semibold text-gray-900">Milestone Automation</h2>
            <p className="mb-6 text-sm text-gray-500">
              Shoutboard will automatically create recognition boards before upcoming milestones.
            </p>

            <div className="space-y-5">
              {/* Birthday toggle */}
              <label className="flex items-start justify-between gap-4 cursor-pointer">
                <div>
                  <div className="flex items-center gap-2">
                    <Cake size={16} className="text-pink-500" />
                    <span className="font-medium text-gray-900">Birthday boards</span>
                  </div>
                  <p className="mt-0.5 text-sm text-gray-500">
                    Auto-create a Birthday board before each employee's birthday.
                  </p>
                </div>
                <div
                  onClick={() =>
                    configMutation.mutate({ birthdayEnabled: !config.birthdayEnabled })
                  }
                  className={`relative flex-shrink-0 h-6 w-11 cursor-pointer rounded-full transition-colors ${
                    config.birthdayEnabled ? 'bg-indigo-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                      config.birthdayEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </div>
              </label>

              {/* Anniversary toggle */}
              <label className="flex items-start justify-between gap-4 cursor-pointer">
                <div>
                  <div className="flex items-center gap-2">
                    <Briefcase size={16} className="text-indigo-500" />
                    <span className="font-medium text-gray-900">Work anniversary boards</span>
                  </div>
                  <p className="mt-0.5 text-sm text-gray-500">
                    Auto-create an Anniversary board on each employee's work anniversary.
                  </p>
                </div>
                <div
                  onClick={() =>
                    configMutation.mutate({ anniversaryEnabled: !config.anniversaryEnabled })
                  }
                  className={`relative flex-shrink-0 h-6 w-11 cursor-pointer rounded-full transition-colors ${
                    config.anniversaryEnabled ? 'bg-indigo-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                      config.anniversaryEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </div>
              </label>

              {/* Auto-activate toggle */}
              <label className="flex items-start justify-between gap-4 cursor-pointer">
                <div>
                  <span className="font-medium text-gray-900">Auto-activate share link</span>
                  <p className="mt-0.5 text-sm text-gray-500">
                    Automatically activate the board so teammates can start adding messages right away.
                  </p>
                </div>
                <div
                  onClick={() =>
                    configMutation.mutate({ autoActivate: !config.autoActivate })
                  }
                  className={`relative flex-shrink-0 h-6 w-11 cursor-pointer rounded-full transition-colors ${
                    config.autoActivate ? 'bg-indigo-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                      config.autoActivate ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </div>
              </label>

              {/* Days ahead */}
              <div>
                <label className="mb-1 block font-medium text-gray-900">
                  Create board this many days before the milestone
                </label>
                <p className="mb-2 text-sm text-gray-500">
                  Gives your team time to add messages before it's sent.
                </p>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={1}
                    max={30}
                    value={config.daysAhead}
                    onChange={(e) =>
                      configMutation.mutate({ daysAhead: parseInt(e.target.value) })
                    }
                    className="flex-1 accent-indigo-600"
                  />
                  <span className="w-16 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-center text-sm font-semibold text-gray-900">
                    {config.daysAhead}d
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4 text-sm text-indigo-900">
            <strong>How it works:</strong> Every hour Shoutboard checks for upcoming milestones.
            When a birthday or anniversary is within your configured window, a board is
            automatically created{config.autoActivate ? ' and activated' : ''} — and scheduled to
            send on the day of the milestone.
          </div>
        </div>
      )}
    </div>
  )
}
