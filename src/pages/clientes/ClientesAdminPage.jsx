import { useState, useEffect, useMemo, useCallback } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { getCustomers, toggleCustomerActive, setCustomerRole } from '../../services/adminService'
import Pagination from '../../components/Pagination'
import './clientes.css'

const toArr = (d) => Array.isArray(d) ? d : (d?.results ?? [])
const PAGE_SIZE = 5

export default function ClientesAdminPage() {
  const { user } = useAuth()

  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [actionId, setActionId] = useState(null)
  const [toast, setToast] = useState(null)
  const [page, setPage] = useState(1)

  const showToast = useCallback((msg, err = false) => {
    setToast({ msg, err })
    setTimeout(() => setToast(null), 3200)
  }, [])

  useEffect(() => {
    setLoading(true)
    getCustomers({ page_size: 100 })
      .then(d => setCustomers(toArr(d)))
      .catch(() => showToast('Error al cargar los clientes', true))
      .finally(() => setLoading(false))
  }, [showToast])

  // KPIs and filtered list react to search/role changes (same as wireframe's filterAndRenderCustomers)
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return customers.filter(c => {
      if (roleFilter !== 'all' && c.role !== roleFilter) return false
      if (!q) return true
      return (
        String(c.id).includes(q) ||
        (c.full_name || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q)
      )
    })
  }, [customers, search, roleFilter])

  useEffect(() => { setPage(1) }, [search, roleFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  useEffect(() => { if (page > totalPages) setPage(totalPages) }, [totalPages, page])
  const paginated = useMemo(() => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filtered, page])

  const kpis = useMemo(() => {
    const total = filtered.length
    const active = filtered.filter(c => c.is_active).length
    const inactive = total - active
    const admins = filtered.filter(c => c.role === 'admin').length
    return { total, active, inactive, admins }
  }, [filtered])

  const pct = (n) => kpis.total > 0 ? Math.round((n / kpis.total) * 100) : 0

  const handleToggle = useCallback(async (id) => {
    setActionId(`${id}_act`)
    try {
      const upd = await toggleCustomerActive(id)
      setCustomers(prev => prev.map(c => c.id === id ? { ...c, ...upd } : c))
      showToast(upd.is_active ? 'Cuenta activada correctamente' : 'Cuenta deshabilitada')
    } catch {
      showToast('Error al cambiar el estado', true)
    } finally {
      setActionId(null)
    }
  }, [showToast])

  const handleRole = useCallback(async (id, currentRole) => {
    const newRole = currentRole === 'admin' ? 'usuario' : 'admin'
    setActionId(`${id}_role`)
    try {
      const upd = await setCustomerRole(id, newRole)
      setCustomers(prev => prev.map(c => c.id === id ? { ...c, ...upd } : c))
      showToast(`Rol cambiado a ${newRole === 'admin' ? 'Administrador' : 'Usuario'}`)
    } catch {
      showToast('Error al cambiar el rol', true)
    } finally {
      setActionId(null)
    }
  }, [showToast])

  return (
    <>
      {/* Toast */}
      {toast && (
        <div className={`cp-toast ${toast.err ? 'cp-toast-err' : 'cp-toast-ok'}`}>
          <i className={`fas ${toast.err ? 'fa-circle-exclamation' : 'fa-circle-check'} mr-2`}></i>
          {toast.msg}
        </div>
      )}

      {/* ── Page ─────────────────────────────────────────────────── */}
      <section className="mb-10 fade-in-up space-y-6">

        {/* ── Header ─────────────────────────────────────────────── */}
        <header className="flex items-start justify-between flex-wrap gap-4">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-600 mb-2">
              Gestión de usuarios
            </p>
            <h2 className="panel-title text-3xl md:text-4xl font-semibold text-slate-900 leading-tight">
              Clientes Registrados
            </h2>
            <p className="mt-3 text-sm md:text-base text-slate-500 leading-7">
              Administra los usuarios registrados en la plataforma. Puedes buscar, filtrar por rol y gestionar el estado de cada cuenta.
            </p>
          </div>
          <div className="cp-panel px-4 py-3 min-w-[240px]">
            <p className="text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-slate-400">Total clientes</p>
            <p className="mt-1 text-base font-semibold text-slate-900">{kpis.total}</p>
            <p className="mt-1 text-sm cp-muted">{kpis.active} activos · {kpis.inactive} inactivos</p>
          </div>
        </header>

        {/* ── KPI cards ─────────────────────────────────────────── */}
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">

          <article className="kpi-card p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Total clientes</p>
                <p className="mt-2 text-4xl font-bold text-slate-900">{kpis.total}</p>
                <p className="mt-2 text-sm cp-muted">Usuarios registrados</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-brand-50 flex items-center justify-center border border-brand-100 flex-shrink-0">
                <i className="fas fa-users text-brand-600 text-xl"></i>
              </div>
            </div>
            <div className="mt-5 kpi-sparkline"></div>
          </article>

          <article className="kpi-card p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Activos</p>
                <p className="mt-2 text-4xl font-bold text-emerald-700">{kpis.active}</p>
                <p className="mt-2 text-sm cp-muted">Cuentas habilitadas</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center border border-emerald-100 flex-shrink-0">
                <i className="fas fa-check-circle text-emerald-600 text-xl"></i>
              </div>
            </div>
            <div className="mt-5 kpi-sparkline kpi-sparkline--emerald"></div>
          </article>

          <article className="kpi-card p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Administradores</p>
                <p className="mt-2 text-4xl font-bold text-sky-700">{kpis.admins}</p>
                <p className="mt-2 text-sm cp-muted">Con permisos totales</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-sky-50 flex items-center justify-center border border-sky-100 flex-shrink-0">
                <i className="fas fa-shield-halved text-sky-600 text-xl"></i>
              </div>
            </div>
            <div className="mt-5 kpi-sparkline kpi-sparkline--sky"></div>
          </article>

          <article className="kpi-card p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Inactivos</p>
                <p className="mt-2 text-4xl font-bold text-slate-500">{kpis.inactive}</p>
                <p className="mt-2 text-sm cp-muted">Cuentas deshabilitadas</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-200 flex-shrink-0">
                <i className="fas fa-user-slash text-slate-500 text-xl"></i>
              </div>
            </div>
            <div className="mt-5 kpi-sparkline kpi-sparkline--slate"></div>
          </article>

        </section>

        {/* ── Main grid ─────────────────────────────────────────── */}
        <section className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-6">

          {/* ── Table panel ───────────────────────────────────────── */}
          <article className="cp-panel overflow-hidden">
            <header className="cp-panel-header px-5 py-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-brand-600 font-semibold">Filtros</p>
                <h3 className="mt-1 panel-title text-2xl font-semibold text-slate-900">
                  Buscar y filtrar clientes
                </h3>
              </div>
              <span className="text-xs text-slate-500">Gestión de usuarios</span>
            </header>

            <div className="px-5 py-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Buscar cliente</label>
                  <div className="relative">
                    <input
                      type="search"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="Buscar por nombre, correo o ID..."
                      className="cp-input"
                    />
                    <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Filtrar por rol</label>
                  <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="cp-select">
                    <option value="all">Todos</option>
                    <option value="admin">Administrador</option>
                    <option value="usuario">Usuario</option>
                  </select>
                </div>
              </div>
            </div>

            {/* ── Tarjetas — solo mobile ── */}
            <div className="md:hidden border-t border-slate-100">
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-12 text-slate-400">
                  <i className="fas fa-spinner fa-spin"></i>
                  <span className="text-sm font-medium">Cargando clientes…</span>
                </div>
              ) : filtered.length === 0 ? (
                <p className="text-center py-8 text-slate-400 text-sm">Sin registros</p>
              ) : (
                <ul className="space-y-3 p-4 list-none m-0">
                  {paginated.map(c => {
                    const isMe = c.id === user?.id
                    const initLetter = (c.full_name || c.username || 'U').charAt(0).toUpperCase()
                    return (
                      <li key={c.id} className="bg-white rounded-3xl border border-slate-200 p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-12 h-12 rounded-full overflow-hidden border border-slate-200 flex-shrink-0 flex items-center justify-center">
                            {c.profile_photo_url
                              ? <img src={c.profile_photo_url} alt="" className="w-full h-full object-cover" />
                              : <span className="w-full h-full flex items-center justify-center font-semibold text-white text-base bg-brand-600">{initLetter}</span>
                            }
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-800 truncate">{c.full_name || c.username}</p>
                            {c.email && (
                              <a href={`mailto:${c.email}`} className="text-xs text-slate-500 truncate block hover:text-sky-400">{c.email}</a>
                            )}
                            {c.phone && (
                              <a href={`https://wa.me/${c.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                                className="text-xs text-green-600 hover:text-green-700">{c.phone}</a>
                            )}
                            {c.date_joined && (
                              <p className="text-xs text-slate-400">
                                Registro: {new Date(c.date_joined).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex justify-between items-center text-xs font-semibold mb-3">
                          <span className={`px-2 py-1 rounded ${c.role === 'admin' ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-700'}`}>
                            {c.role === 'admin' ? 'Administrador' : 'Usuario'}
                          </span>
                          <span className={`px-2 py-1 rounded ${c.is_active ? 'bg-brand-100 text-brand-700' : 'bg-red-100 text-red-700'}`}>
                            {c.is_active ? 'Activo' : 'Inactivo'}
                          </span>
                        </div>
                        {!isMe ? (
                          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                            <button
                              onClick={() => handleToggle(c.id)}
                              disabled={actionId === `${c.id}_act`}
                              className={`text-xs font-semibold px-2 py-1.5 rounded-lg transition w-full border-none cursor-pointer ${c.is_active ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-brand-50 text-brand-700 hover:bg-brand-100'}`}
                            >
                              {actionId === `${c.id}_act` ? <i className="fas fa-spinner fa-spin"></i> : c.is_active ? 'Deshabilitar' : 'Habilitar'}
                            </button>
                            <button
                              onClick={() => handleRole(c.id, c.role)}
                              disabled={actionId === `${c.id}_role`}
                              className="text-xs font-semibold bg-slate-50 text-slate-600 px-2 py-1.5 rounded-lg hover:bg-slate-100 transition w-full border-none cursor-pointer"
                            >
                              {actionId === `${c.id}_role` ? <i className="fas fa-spinner fa-spin"></i> : 'Cambiar Rol'}
                            </button>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 text-center pt-2 border-t border-slate-100">Tu cuenta</p>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
              <Pagination page={page} totalPages={totalPages} onChange={setPage} />
            </div>

            {/* ── Tabla — solo desktop ── */}
            <div className="hidden md:block cp-table-scroll border-t border-slate-100">
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-12 text-slate-400">
                  <i className="fas fa-spinner fa-spin"></i>
                  <span className="text-sm font-medium">Cargando clientes…</span>
                </div>
              ) : (
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Foto</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Nombres</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Teléfono</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Correo</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Rol</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Estado</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Registro</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-6 text-slate-400 text-sm">Sin registros</td>
                      </tr>
                    ) : paginated.map(c => {
                      const isMe = c.id === user?.id
                      const initLetter = (c.full_name || c.username || 'U').charAt(0).toUpperCase()
                      return (
                        <tr key={c.id} className="cp-tr transition">
                          <td className="px-4 py-3">
                            <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center border border-slate-200">
                              {c.profile_photo_url
                                ? <img src={c.profile_photo_url} alt="" className="w-full h-full object-cover" />
                                : <span className="w-full h-full flex items-center justify-center font-semibold text-white text-sm bg-brand-600">{initLetter}</span>
                              }
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-slate-800 whitespace-nowrap">{c.full_name || c.username}</td>
                          <td className="px-4 py-3 text-sm text-green-600">
                            {c.phone
                              ? <a href={`https://wa.me/${c.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="hover:text-green-700">{c.phone}</a>
                              : '—'}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600">
                            {c.email && <a href={`mailto:${c.email}`} className="hover:text-sky-400">{c.email}</a>}
                          </td>
                          <td className="px-4 py-3 text-xs font-bold">
                            <span className={`px-2 py-0.5 rounded ${c.role === 'admin' ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-700'}`}>
                              {c.role === 'admin' ? 'Administrador' : 'Usuario'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs font-bold">
                            <span className={`px-2 py-0.5 rounded ${c.is_active ? 'bg-brand-100 text-brand-700' : 'bg-red-100 text-red-700'}`}>
                              {c.is_active ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                            {c.date_joined
                              ? new Date(c.date_joined).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })
                              : '—'}
                          </td>
                          <td className="px-4 py-3">
                            {isMe ? (
                              <span className="text-xs bg-slate-100 text-slate-400 p-1.5 rounded">Tu cuenta</span>
                            ) : (
                              <div className="flex flex-col gap-1">
                                <button
                                  onClick={() => handleToggle(c.id)}
                                  disabled={actionId === `${c.id}_act`}
                                  className={`text-xs font-semibold px-2 py-1 rounded-lg transition border-none cursor-pointer ${c.is_active ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-brand-50 text-brand-700 hover:bg-brand-100'}`}
                                >
                                  {actionId === `${c.id}_act` ? <i className="fas fa-spinner fa-spin"></i> : c.is_active ? 'Deshabilitar' : 'Habilitar'}
                                </button>
                                <button
                                  onClick={() => handleRole(c.id, c.role)}
                                  disabled={actionId === `${c.id}_role`}
                                  className="text-xs font-semibold bg-slate-50 text-slate-600 px-2 py-1 rounded-lg hover:bg-slate-100 transition border-none cursor-pointer"
                                >
                                  {actionId === `${c.id}_role` ? <i className="fas fa-spinner fa-spin"></i> : 'Cambiar Rol'}
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
              <Pagination page={page} totalPages={totalPages} onChange={setPage} />
            </div>
          </article>

          {/* ── Right column ──────────────────────────────────────── */}
          <div className="space-y-6">

            {/* Distribution panel */}
            <article className="cp-panel overflow-hidden">
              <header className="cp-panel-header px-5 py-4 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-brand-600 font-semibold">Resumen</p>
                  <h3 className="mt-1 panel-title text-2xl font-semibold text-slate-900">
                    Distribución de cuentas
                  </h3>
                </div>
                <span className="text-xs text-slate-500">Roles y estados</span>
              </header>
              <div className="px-5 py-5">
                <div className="space-y-4">

                  {/* Activos */}
                  <div className="rounded-2xl border border-brand-100 px-4 py-3 flex items-center justify-between cp-dist-row--green">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">Activos</p>
                      <p className="text-lg font-semibold text-emerald-700 mt-0.5">{kpis.active}</p>
                    </div>
                    <span className="text-sm font-medium text-emerald-600">{pct(kpis.active)}%</span>
                  </div>

                  {/* Inactivos */}
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">Inactivos</p>
                      <p className="text-lg font-semibold text-slate-500 mt-0.5">{kpis.inactive}</p>
                    </div>
                    <span className="text-sm font-medium text-slate-500">{pct(kpis.inactive)}%</span>
                  </div>

                  {/* Administradores */}
                  <div className="rounded-2xl border border-sky-100 px-4 py-3 flex items-center justify-between cp-dist-row--sky">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">Administradores</p>
                      <p className="text-lg font-semibold text-sky-700 mt-0.5">{kpis.admins}</p>
                    </div>
                    <span className="text-sm font-medium text-sky-600">{pct(kpis.admins)}%</span>
                  </div>

                </div>
              </div>
            </article>

          </div>
        </section>
      </section>
    </>
  )
}
