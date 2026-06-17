import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { updateProfile, getProfilePreferences, updateProfilePreferences, changePassword } from '../services/authService'
import { getFarms, createFarm, deleteFarm, createPlot, deletePlot, getConversations, getConversation, createConversation, deleteConversation, sendMessage } from '../services/chatbotService'
import { uploadImage, updateAnalysis } from '../services/analysisService'
export default function ChatbotPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuPos, setMenuPos] = useState({ left: 0, bottom: 0 })
  const [inputValue, setInputValue] = useState('')
  const [messages, setMessages] = useState([])
  const [showWelcome, setShowWelcome] = useState(true)
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [sending, setSending] = useState(false)
  const [copiedIndex, setCopiedIndex] = useState(null)
  const [micActive, setMicActive] = useState(false)
  const [farms, setFarms] = useState([])
  const [conversations, setConversations] = useState([])
  const [activeConvId, setActiveConvId] = useState(null)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [showParcelasModal, setShowParcelasModal] = useState(false)
  const [showAddFarmModal, setShowAddFarmModal] = useState(false)
  const [showAddPlotModal, setShowAddPlotModal] = useState(false)
  const [selectedFarmForPlot, setSelectedFarmForPlot] = useState(null)
  const [showContextModal, setShowContextModal] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [confirmDeleteConv, setConfirmDeleteConv] = useState(null)
  const [contextSelectedFarmId, setContextSelectedFarmId] = useState('')
  const [contextSelectedZone, setContextSelectedZone] = useState('')
  const [farmName, setFarmName] = useState('')
  const [farmLocation, setFarmLocation] = useState('')
  const [plotName, setPlotName] = useState('')
  const [plotGps, setPlotGps] = useState('')
  const [plotHectares, setPlotHectares] = useState('')
  const [plotZone, setPlotZone] = useState('')
  const [plotRows, setPlotRows] = useState('')
  const [profileForm, setProfileForm] = useState({ email: '', phone: '', first_name: '', last_name: '', dni: '' })
  const [profilePhotoFile, setProfilePhotoFile] = useState(null)
  const [profilePhotoPreview, setProfilePhotoPreview] = useState(null)
  const [sessionMenuState, setSessionMenuState] = useState({ sessionId: null, left: 0, top: 0, open: false })
  const [contextOptions, setContextOptions] = useState({ lotId: [], zone: [], rows: [] })
  const menuRef = useRef(null)
  const triggerRef = useRef(null)
  const chatAreaRef = useRef(null)
  const fileInputRef = useRef(null)
  const inpRef = useRef(null)
  const contextDatetimeRef = useRef(null)
  const contextLotRef = useRef(null)
  const contextZoneRef = useRef(null)
  const contextRowsRef = useRef(null)
  const contextPlantRef = useRef(null)
  const contextLocationRef = useRef(null)
  const contextSymptomRef = useRef(null)
  const contextPartRef = useRef(null)
  const contextStageRef = useRef(null)
  const contextSeverityRef = useRef(null)
  const contextIrrigationRef = useRef(null)
  const contextPhytoRef = useRef(null)
  const contextNotesRef = useRef(null)
  const settingsThemeRef = useRef(null)
  const settingsFontSizeRef = useRef(null)
  const settingsFontFamilyRef = useRef(null)
  const settingsHighContrastRef = useRef(null)
  const settingsReducedMotionRef = useRef(null)
  const settingsColorBlindRef = useRef(null)
  const settingsDyslexicFontRef = useRef(null)
  const settingsLotInputRef = useRef(null)
  const settingsZoneInputRef = useRef(null)
  const settingsRowsInputRef = useRef(null)
  const displayName = user?.full_name || user?.username || 'Usuario'
  const userEmail = user?.email || ''
  const roleLabel = user?.role_label || (user?.is_admin ? 'Administrador' : 'Usuario')
  const initials = (() => {
    const parts = displayName.split(' ')
    return parts.length > 1 ? (parts[0][0] + parts[1][0]).toUpperCase() : displayName.substring(0, 2).toUpperCase()
  })()
  const profilePhotoUrl = user?.profile_photo_url

  const location = useLocation()
  const [searchParams] = useSearchParams()
  const urlConvId = searchParams.get('conversation')
  const stateConvId = location.state?.conversationId
  const targetConvId = stateConvId || urlConvId

  useEffect(() => { loadFarms(); loadConversations() }, [])

  useEffect(() => {
    if (!targetConvId) return
    async function loadConversation() {
      try {
        const full = await getConversation(targetConvId)
        if (full && full.id) {
          setActiveConvId(full.id)
          setMessages(full.messages || [])
          setShowWelcome(false)
          setConversations(prev => prev.some(c => c.id === full.id) ? prev : [...prev, full])
        }
      } catch {}
    }
    if (!conversations.length) {
      loadConversation()
    } else {
      const found = conversations.find(c => String(c.id) === String(targetConvId))
      if (found) {
        selectConversation(found)
      } else {
        loadConversation()
      }
    }
  }, [targetConvId])

  useEffect(() => {
    function handleClick(e) {
      if (!menuOpen) return
      if (menuRef.current && !menuRef.current.contains(e.target) && triggerRef.current && !triggerRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [menuOpen])

  useEffect(() => {
    if (chatAreaRef.current) chatAreaRef.current.scrollTop = chatAreaRef.current.scrollHeight
  }, [messages])

  const loadFarms = async () => {
    try { const d = await getFarms(); setFarms(Array.isArray(d) ? d : d.results || []) } catch { setFarms([]) }
  }

  const loadConversations = async () => {
    try { const d = await getConversations(); setConversations(Array.isArray(d) ? d : d.results || []) } catch { setConversations([]) }
  }

  const toggleUserMenu = () => {
    if (menuOpen) { setMenuOpen(false); return }
    const trigger = triggerRef.current
    if (!trigger) return
    const rect = trigger.getBoundingClientRect()
    const W = 383, MARGIN = 10
    let left = rect.left
    let bottom = window.innerHeight - rect.top + 10
    if (left + W > window.innerWidth - MARGIN) left = window.innerWidth - W - MARGIN
    if (left < MARGIN) left = MARGIN
    setMenuPos({ left, bottom })
    setMenuOpen(true)
  }

  const handleLogout = async () => { await logout(); navigate('/login', { replace: true }) }

  const openSidebar = () => { setSidebarOpen(true); document.body.style.overflow = 'hidden' }
  const closeSidebar = () => { setSidebarOpen(false); document.body.style.overflow = '' }

  const openSessionMenu = (convId, buttonEl) => {
    const rect = buttonEl.getBoundingClientRect()
    const width = 210, gap = 8
    const isMobile = window.innerWidth < 768
    let left, top
    if (isMobile) {
      left = Math.max(12, Math.round((272 - width) / 2))
      top = rect.top + rect.height + gap
      if (top + 120 > window.innerHeight - 12) top = rect.top - 120 - gap
    } else {
      left = 272 + 12
      top = rect.top - 13
      if (left + width > window.innerWidth - 12) left = window.innerWidth - width - 12
      if (top + 120 > window.innerHeight - 12) top = rect.top - 120 - gap
    }
    if (top < 12) top = 12
    setSessionMenuState({ sessionId: convId, left, top, open: true })
  }

  const closeSessionMenu = () => setSessionMenuState({ sessionId: null, left: 0, top: 0, open: false })

  const togglePinConversation = (convId) => {
    setConversations(prev => prev.map(c => c.id === convId ? { ...c, pinnedAt: c.pinnedAt ? null : Date.now() } : c))
    closeSessionMenu()
  }

  const getConvPinState = (convId) => {
    const conv = conversations.find(c => c.id === convId)
    return conv?.pinnedAt ? true : false
  }

  const sortedConversations = [...conversations].sort((a, b) => {
    const aPinned = a.pinnedAt || 0, bPinned = b.pinnedAt || 0
    if (aPinned !== bPinned) return bPinned - aPinned
    return (b.updated_at || 0) - (a.updated_at || 0)
  })

  const newChat = () => {
    setMessages([]); setInputValue(''); setImageFile(null); setImagePreview(null)
    setShowWelcome(true); setActiveConvId(null); setContextSelectedFarmId(''); setContextSelectedZone('')
    closeSidebar(); setShowContextModal(true)
  }

  const selectConversation = async (conv) => {
    setActiveConvId(conv.id)
    try {
      const full = await getConversation(conv.id)
      setMessages(full.messages || [])
    } catch {
      setMessages(conv.messages || [])
    }
    setShowWelcome(false)
    if (window.innerWidth < 768) closeSidebar()
  }

  const handleDeleteConversation = async () => {
    if (!confirmDeleteConv) return
    try {
      await deleteConversation(confirmDeleteConv)
      if (activeConvId === confirmDeleteConv) newChat()
      setConfirmDeleteConv(null); closeSessionMenu(); loadConversations()
    } catch { alert('Error al eliminar la conversacion') }
  }

  const handleSendMessage = async () => {
    const text = inputValue.trim()
    if (!text && !imageFile) return
    const imgFile = imageFile
    const imgPrev = imagePreview
    const imgType = imageFile?.type || ''
    removeImage()
    setMessages(prev => [...prev, { role: 'user', content: text, image_type: imgType, image_path: imgPrev }]); setInputValue(''); setShowWelcome(false); setSending(true)
    let convId = activeConvId
    try {
      if (!convId) {
        const conv = await createConversation({ title: text.substring(0, 100) || 'Nueva conversacion' })
        convId = conv.id; setActiveConvId(convId); loadConversations()
      }
      let imageUrl = ''
      let analysisResult = null
      if (imgFile) {
        const formData = new FormData()
        formData.append('image_path', imgFile)
        formData.append('conversation', convId)
        analysisResult = await uploadImage(formData)
        imageUrl = analysisResult.image_url || ''
      }
      const userMsg = await sendMessage({ conversation: convId, role: 'user', content: text, image_type: imgType, image_path: imageUrl })
      if (analysisResult && analysisResult.id) {
        updateAnalysis(analysisResult.id, { chat_message: userMsg.id }).catch(() => {})
      }
      const botReply = analysisResult
        ? '**Analisis de imagen completado**\n\n**Diagnostico:** ' + (analysisResult.disease_name_predicted || 'Pendiente') + '\n**Severidad:** ' + (analysisResult.severity || 'Desconocida') + '\n**Confianza:** ' + (analysisResult.confidence_percent || '---') + '\n\n' + (analysisResult.recommendations_text || 'Consulta con un ingeniero agronomo para una evaluacion mas precisa.')
        : 'Estoy procesando tu consulta sobre el cultivo. Un asesor agricola podra darte una respuesta mas precisa.'
      await sendMessage({ conversation: convId, role: 'assistant', content: botReply })
      try {
        const full = await getConversation(convId)
        setMessages(full.messages || [])
      } catch {
        setMessages(prev => [...prev, { role: 'assistant', content: botReply }])
      }
      loadConversations()
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Ocurrio un error al procesar tu mensaje. Intenta de nuevo.' }])
    }
    setSending(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage() }
  }

  const suggest = (text) => {
    setInputValue(text)
    setMessages(prev => [...prev, { role: 'user', content: text }])
    setShowWelcome(false); setSending(true)
    setTimeout(async () => {
      const botReply = 'Gracias por tu consulta. Estoy analizando la informacion para brindarte una respuesta adecuada sobre el manejo de tu cultivo de pitahaya.'
      setSending(false)
      try {
        let convId = activeConvId
        if (!convId) {
          const conv = await createConversation({ title: text.substring(0, 100) })
          convId = conv.id; setActiveConvId(convId); loadConversations()
        }
        await sendMessage({ conversation: convId, role: 'user', content: text })
        await sendMessage({ conversation: convId, role: 'assistant', content: botReply })
        try {
          const full = await getConversation(convId)
          setMessages(full.messages || [])
        } catch {
          setMessages(prev => [...prev, { role: 'assistant', content: botReply }])
        }
        loadConversations()
      } catch {}
    }, 800)
  }

  const handleImageSelect = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setImageFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setImagePreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  const removeImage = () => { setImageFile(null); setImagePreview(null); if (fileInputRef.current) fileInputRef.current.value = '' }

  const openParcelasModal = () => { setShowParcelasModal(true); closeSidebar() }

  const handleSelectPlot = (plot, farm) => {
    setContextSelectedFarmId(farm.id); setContextSelectedZone(plot.zone || '')
    if (contextRowsRef.current) contextRowsRef.current.value = plot.name
    if (contextLocationRef.current && plot.gps_location) contextLocationRef.current.value = plot.gps_location
    if (contextDatetimeRef.current && !contextDatetimeRef.current.value) {
      contextDatetimeRef.current.value = new Date().toISOString().slice(0, 16)
    }
    setShowParcelasModal(false); setShowContextModal(true)
  }

  const closeParcelasModal = () => { setShowParcelasModal(false) }

  const openAddFarmModal = () => { setFarmName(''); setFarmLocation(''); setShowAddFarmModal(true) }

  const handleCreateFarm = async () => {
    if (!farmName.trim()) return
    try { await createFarm({ name: farmName.trim(), location: farmLocation.trim() }); setShowAddFarmModal(false); loadFarms() } catch { alert('Error al crear la finca') }
  }

  const handleDeleteFarm = async (id) => {
    if (confirmDelete === id) { try { await deleteFarm(id); setConfirmDelete(null); loadFarms() } catch { alert('Error al eliminar la finca') } }
    else { setConfirmDelete(id) }
  }

  const openDeleteConvModal = (convId) => {
    setConfirmDeleteConv(convId); closeSessionMenu()
  }

  const openAddPlotModal = (farm) => {
    setSelectedFarmForPlot(farm); setPlotName(''); setPlotGps(''); setPlotHectares(''); setPlotZone(''); setPlotRows('')
    setShowAddPlotModal(true)
  }

  const handleCreatePlot = async () => {
    if (!plotName.trim() || !selectedFarmForPlot) return
    try {
      await createPlot({ farm: selectedFarmForPlot.id, name: plotName.trim(), gps_location: plotGps.trim(), hectares: parseFloat(plotHectares) || 0, zone: plotZone.trim(), rows: plotRows.trim() })
      setShowAddPlotModal(false); loadFarms()
    } catch { alert('Error al crear la parcela') }
  }

  const handleDeletePlot = async (id) => { try { await deletePlot(id); loadFarms() } catch { alert('Error al eliminar la parcela') } }

  const openProfileModal = () => {
    setProfileForm({ email: user?.email || '', phone: user?.phone || '', first_name: user?.first_name || '', last_name: user?.last_name || '', dni: user?.dni || '' })
    setProfilePhotoFile(null); setProfilePhotoPreview(null)
    setShowProfileModal(true); setMenuOpen(false)
  }

  const handleProfilePhotoSelect = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setProfilePhotoFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setProfilePhotoPreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  const handleUpdateProfile = async (e) => {
    e.preventDefault()
    try {
      const fd = new FormData()
      fd.append('email', profileForm.email); fd.append('phone', profileForm.phone)
      fd.append('first_name', profileForm.first_name); fd.append('last_name', profileForm.last_name); fd.append('dni', profileForm.dni)
      if (profilePhotoFile) fd.append('profile_photo', profilePhotoFile)
      await updateProfile(fd)
      alert('Perfil actualizado correctamente.')
      setShowProfileModal(false)
      window.location.reload()
    } catch { alert('Error al actualizar el perfil') }
  }

  const openSettingsModal = () => { setShowSettingsModal(true); setMenuOpen(false); loadSettings() }

  const loadSettings = async () => {
    try {
      const prefs = await getProfilePreferences()
      const s = prefs.preferences || {}
      if (settingsThemeRef.current) settingsThemeRef.current.value = s.theme || 'light'
      if (settingsFontSizeRef.current) settingsFontSizeRef.current.value = s.fontSize || 'medium'
      if (settingsFontFamilyRef.current) settingsFontFamilyRef.current.value = s.fontFamily || 'inter'
      if (settingsHighContrastRef.current) settingsHighContrastRef.current.checked = s.highContrast || false
      if (settingsReducedMotionRef.current) settingsReducedMotionRef.current.checked = s.reducedMotion || false
      if (settingsDyslexicFontRef.current) settingsDyslexicFontRef.current.checked = s.dyslexicFont || false
      if (settingsColorBlindRef.current) settingsColorBlindRef.current.value = s.colorBlind || 'none'
      const ctx = prefs.preferences?.contextOptions || { lotId: ['Lote 1', 'Lote 2', 'Sector A', 'Sector B'], zone: ['Zona norte', 'Zona sur', 'Zona este', 'Zona oeste'], rows: ['Parcela 1, hilera 1-5', 'Parcela 2, hilera 6-10'] }
      setContextOptions(ctx)
    } catch {}
  }

  const handleSaveSettings = async () => {
    const preferences = {
      theme: settingsThemeRef.current?.value || 'light', fontSize: settingsFontSizeRef.current?.value || 'medium',
      fontFamily: settingsFontFamilyRef.current?.value || 'inter', highContrast: settingsHighContrastRef.current?.checked || false,
      reducedMotion: settingsReducedMotionRef.current?.checked || false, dyslexicFont: settingsDyslexicFontRef.current?.checked || false,
      colorBlind: settingsColorBlindRef.current?.value || 'none', contextOptions,
    }
    try { await updateProfilePreferences({ preferences }); alert('Configuraciones guardadas.'); setShowSettingsModal(false) } catch { alert('Error al guardar configuraciones') }
  }

  const addContextOption = (field) => {
    const inputRef = { lotId: settingsLotInputRef, zone: settingsZoneInputRef, rows: settingsRowsInputRef }[field]
    const value = inputRef.current?.value?.trim()
    if (!value) return
    if (!contextOptions[field].includes(value)) setContextOptions(prev => ({ ...prev, [field]: [...prev[field], value] }))
    if (inputRef.current) inputRef.current.value = ''
  }

  const removeContextOption = (field, value) => { setContextOptions(prev => ({ ...prev, [field]: prev[field].filter(v => v !== value) })) }

  const exportBackup = () => {
    const data = {}
    const keys = ['auth_token', 'pitahayaVision.sessions.v2', 'pitahayaVision.plantHistory.v1', 'pitahayaVision.contextOptions.v1', 'pitahayaVision.settings.v1']
    keys.forEach(key => { try { const raw = localStorage.getItem(key); if (raw) data[key] = JSON.parse(raw) } catch {} })
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), data }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob); const a = document.createElement('a')
    a.href = url; a.download = `pitahaya_backup_${new Date().toISOString().slice(0, 10)}.json`; a.click()
    URL.revokeObjectURL(url)
  }

  const importBackup = (e) => {
    const file = e.target.files[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result)
        if (!parsed.data || typeof parsed.data !== 'object') throw new Error()
        Object.entries(parsed.data).forEach(([key, value]) => { if (key !== 'auth_token') localStorage.setItem(key, JSON.stringify(value)) })
        alert('Respaldo importado correctamente. Recarga la pagina.')
      } catch { alert('Archivo invalido') }
    }
    reader.readAsText(file); e.target.value = ''
  }

  const resetSettings = () => {
    if (settingsThemeRef.current) settingsThemeRef.current.value = 'light'
    if (settingsFontSizeRef.current) settingsFontSizeRef.current.value = 'medium'
    if (settingsFontFamilyRef.current) settingsFontFamilyRef.current.value = 'inter'
    if (settingsHighContrastRef.current) settingsHighContrastRef.current.checked = false
    if (settingsReducedMotionRef.current) settingsReducedMotionRef.current.checked = false
    if (settingsDyslexicFontRef.current) settingsDyslexicFontRef.current.checked = false
    if (settingsColorBlindRef.current) settingsColorBlindRef.current.value = 'none'
    setContextOptions({ lotId: ['Lote 1', 'Lote 2', 'Sector A', 'Sector B'], zone: ['Zona norte', 'Zona sur', 'Zona este', 'Zona oeste'], rows: ['Parcela 1, hilera 1-5', 'Parcela 2, hilera 6-10'] })
  }

  const formatBotText = (text) => {
    return text.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/`(.*?)`/g, '<code>$1</code>').replace(/\n/g, '<br>')
  }

  const handleCopy = (text, index) => {
    navigator.clipboard.writeText(text).then(() => { setCopiedIndex(index); setTimeout(() => setCopiedIndex(null), 2000) })
  }

  const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  const micRef = useRef(null)
  const recogRef = useRef(null)
  const micWaveRef = useRef(null)
  const micIconRef = useRef(null)

  const toggleMic = () => {
    if (micActive) { stopMic(); return }
    startMic()
  }

  const startMic = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { alert('Tu navegador no soporta reconocimiento de voz.\\nUsa Chrome para esta funcion.'); return }
    const r = new SR(); r.lang = 'es-ES'; r.continuous = true; r.interimResults = true
    r.onresult = (ev) => {
      let final = '', interim = ''
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const t = ev.results[i][0].transcript
        ev.results[i].isFinal ? final += t : interim += t
      }
      setInputValue(prev => (prev + final) || interim)
    }
    r.onerror = () => stopMic()
    r.onend = () => { if (micActive) r.start() }
    recogRef.current = r; setMicActive(true); r.start()
    if (micRef.current) micRef.current.classList.add('mic-on')
    if (micIconRef.current) micIconRef.current.style.display = 'none'
    if (micWaveRef.current) { micWaveRef.current.classList.remove('hidden'); micWaveRef.current.classList.add('flex') }
  }

  const stopMic = () => {
    setMicActive(false); recogRef.current?.stop()
    if (micRef.current) micRef.current.classList.remove('mic-on')
    if (micIconRef.current) micIconRef.current.style.display = ''
    if (micWaveRef.current) { micWaveRef.current.classList.add('hidden'); micWaveRef.current.classList.remove('flex') }
  }

  return (
    <>
      <style>{`
        * { font-family: 'Inter', sans-serif; box-sizing: border-box; }
        html, body { margin: 0; height: 100%; }
        body { padding-bottom: env(safe-area-inset-bottom); }
        .font-cormorant { font-family: 'Cormorant Garamond', serif; }
        .brand-avatar { background: linear-gradient(135deg, #16a34a, #22c55e, #4ade80); }
        #chatArea::-webkit-scrollbar { width: 3px; }
        #chatArea::-webkit-scrollbar-thumb { background: #d1fae5; border-radius: 4px; }
        #historyList::-webkit-scrollbar { width: 2px; }
        #historyList::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 4px; }
        textarea { resize: none; outline: none; background: transparent; }
        .input-box:focus-within { border-color: #16a34a; box-shadow: 0 0 0 3px rgba(22, 163, 74, .15); }
        .chip:hover { background: #f0fdf4; border-color: #16a34a; }
        .chip:active { background: #dcfce7; }
        .send-active { background: linear-gradient(135deg, #16a34a, #22c55e); cursor: pointer; }
        .send-inactive { background: #e5e7eb; cursor: not-allowed; }
        .user-bubble { background: linear-gradient(135deg, #16a34a, #22c55e); color: #fff; }
        .bot-text strong { font-weight: 600; }
        .bot-text code { background: #f0fdf4; padding: 1px 5px; border-radius: 4px; font-size: .85em; font-family: monospace; color: #15803d; }
        .action-btn:hover { background: #f0fdf4; color: #15803d; }
        .action-btn:active { background: #dcfce7; }
        #drawerOverlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,.35); z-index: 40; }
        #drawerOverlay.open { display: block; }
        #sidebar { position: fixed; top: 0; left: 0; bottom: 0; width: 272px; background: #fff; border-right: 1px solid #f3f4f6; display: flex; flex-direction: column; padding: 1rem; gap: 0.75rem; z-index: 50; overflow: hidden; transform: translateX(0); transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1); }
        @media (max-width: 767px) { #sidebar { transform: translateX(-100%); } #sidebar.open { transform: translateX(0); } }
        @media (min-width: 768px) { #sidebar { position: relative; flex-shrink: 0; } #drawerOverlay { display: none !important; } #menuBtn { display: none !important; } }
        .botanical-bg { position: absolute; bottom: -0.75rem; left: -0.75rem; width: 11rem; opacity: 0.08; pointer-events: none; }
        .chips-grid { display: grid; gap: 0.75rem; grid-template-columns: 1fr 1fr; }
        @media (max-width: 360px) { .chips-grid { grid-template-columns: 1fr; } }
        .input-zone { padding-bottom: max(1.25rem, env(safe-area-inset-bottom)); }
        @keyframes popUp { from { opacity: 0; transform: translateY(14px) scale(0.96); } to { opacity: 1; transform: translateY(0) scale(1); } }
        #userMenu { animation: popUp 0.22s cubic-bezier(0.34, 1.18, 0.64, 1) both; }
        .um-option { display: flex; align-items: center; gap: 13px; padding: 11px 18px; text-decoration: none; transition: background 0.12s; cursor: pointer; }
        .um-option:hover { background: #f9fafb; }
        .um-option:active { background: #f3f4f6; }
        .um-icon { width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 0.78rem; transition: background 0.15s, color 0.15s; }
        #userTrigger { transition: background 0.15s; }
        #userTrigger:hover { background: #f9fafb; }
        #userTrigger:active { background: #f0fdf4; }
        .trigger-ring { transition: box-shadow 0.15s; }
        #userTrigger:hover .trigger-ring { box-shadow: 0 0 0 2px #4ade80; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-up { animation: fadeUp 0.3s ease-out both; }
        @keyframes dotBounce { 0%,80%,100% { transform: translateY(0); opacity: .4; } 40% { transform: translateY(-6px); opacity: 1; } }
        .animate-dot { animation: dotBounce 1.3s infinite; }
        .animate-dot-2 { animation: dotBounce 1.3s .15s infinite; }
        .animate-dot-3 { animation: dotBounce 1.3s .30s infinite; }
        @keyframes pulseRing { 0% { box-shadow: 0 0 0 0 rgba(239,68,68,.5); } 70% { box-shadow: 0 0 0 9px rgba(239,68,68,0); } 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); } }
        .animate-pulse-ring { animation: pulseRing 1.4s infinite; }
        @keyframes wave { 0%,100% { transform: scaleY(.35); } 50% { transform: scaleY(1); } }
        .mic-on { background: #ef4444 !important; animation: pulseRing 1.4s infinite; }
        .wb { width: 3px; height: 14px; background: #fff; border-radius: 2px; transform-origin: center; }
        @keyframes slideIn { 0% { transform: translateX(-100%); } 100% { transform: translateX(0); } }
        .animate-slide-in { animation: slideIn 0.28s cubic-bezier(0.22,1,0.36,1) both; }
        .animate-wave-1 { animation: wave .7s 0s ease-in-out infinite; }
        .animate-wave-2 { animation: wave .7s .1s ease-in-out infinite; }
        .animate-wave-3 { animation: wave .7s .2s ease-in-out infinite; }
        .animate-wave-4 { animation: wave .7s .1s ease-in-out infinite; }
        .animate-wave-5 { animation: wave .7s 0s ease-in-out infinite; }
        .sidebar-btn { display: flex; align-items: center; gap: 0.65rem; padding: 0.6rem 0.75rem; border-radius: 0.75rem; font-size: 0.875rem; color: #4b5563; transition: all 0.14s ease; border: 1px solid #d1d5dba0; cursor: pointer; width: 100%; text-align: left; background: none; }
        .sidebar-btn:hover { background: #f0fdf4; border-color: #22c55e; }
        .sidebar-btn:active { background: #dcfce7; }
        .sidebar-btn.active { background: #f0fdf4; color: #166534; border-color: #bbf7d0; font-weight: 500; }
        .context-overlay { position: fixed; inset: 0; z-index: 230; display: none; align-items: center; justify-content: center; padding: 1rem; background: rgba(15, 23, 42, .45); backdrop-filter: blur(4px); }
        .context-overlay.open { display: flex; }
        .context-modal { width: min(100%, 980px); max-height: min(92dvh, 960px); border-radius: 28px; background: #fff; border: 1px solid #eef2f7; box-shadow: 0 24px 48px rgba(15, 23, 42, .18); overflow: hidden; display: flex; flex-direction: column; }
        .context-modal-header { background: #fff; color: #0f172a; border-bottom: 1px solid #eef2f7; flex-shrink: 0; }
        .context-modal-body { overflow-y: auto; background: linear-gradient(180deg, #fff 0%, #f8fafc 100%); flex: 1; }
        .context-section { border: 1px solid #e5e7eb; background: #fff; border-radius: 22px; padding: 1rem; }
        .context-section-title { font-size: 0.78rem; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: #166534; }
        .context-badge { display: inline-flex; align-items: center; gap: 0.35rem; border-radius: 9999px; border: 1px solid #dcfce7; background: #f0fdf4; color: #15803d; padding: 0.3rem 0.7rem; font-size: 0.68rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
        .context-input, .context-select, .context-textarea { width: 100%; border: 1px solid #dbe4ee; border-radius: 14px; background: #fff; color: #0f172a; padding: 0.78rem 0.9rem; font-size: 0.92rem; transition: border-color 0.14s ease, box-shadow 0.14s ease; }
        .context-input:focus, .context-select:focus, .context-textarea:focus { outline: none; border-color: #16a34a; box-shadow: 0 0 0 3px rgba(22, 163, 74, .12); }
        .context-textarea { min-height: 104px; resize: vertical; }
        .context-save-btn { min-width: 150px; padding: 0.92rem 1.15rem; border-radius: 16px; background: linear-gradient(135deg, #16a34a, #22c55e); color: #fff; font-size: 0.95rem; font-weight: 700; transition: transform 0.14s ease, box-shadow 0.14s ease; box-shadow: 0 14px 26px rgba(22, 163, 74, .18); border: none; cursor: pointer; }
        .context-save-btn:hover { transform: translateY(-1px); }
        .context-secondary-btn { min-width: 110px; padding: 0.92rem 1.1rem; border-radius: 16px; border: 1px solid #dbe4ee; background: #fff; color: #334155; font-size: 0.95rem; font-weight: 600; cursor: pointer; transition: background 0.14s; }
        .context-secondary-btn:hover { background: #f8fafc; }
        .context-summary { border: 1px dashed #dcfce7; background: #f8fafc; border-radius: 18px; padding: 0.9rem 1rem; }
        .settings-field { border: 1px solid #edf2f7; border-radius: 18px; background: #f8fafc; padding: 0.9rem; }
        .settings-add-row { display: flex; gap: 0.65rem; flex-wrap: wrap; }
        .settings-add-row input { min-width: 0; flex: 1 1 220px; }
        .settings-add-btn { min-width: 112px; padding: 0.82rem 1rem; border-radius: 14px; background: linear-gradient(135deg, #16a34a, #22c55e); color: #fff; font-size: 0.9rem; font-weight: 700; border: none; cursor: pointer; }
        .settings-chip-list { display: flex; flex-wrap: wrap; gap: 0.55rem; margin-top: 0.85rem; }
        .settings-chip { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.42rem 0.7rem; border-radius: 9999px; background: #fff; border: 1px solid #dbe4ee; color: #334155; font-size: 0.8rem; }
        .settings-chip button { width: 1.1rem; height: 1.1rem; border-radius: 9999px; background: #e2e8f0; color: #475569; display: inline-flex; align-items: center; justify-content: center; font-size: 0.65rem; flex-shrink: 0; border: none; cursor: pointer; }
        .settings-chip button:hover { background: #cbd5e1; }
        .parcelas-farm-card { border: 1px solid #eef2f7; border-radius: 22px; background: #fff; overflow: hidden; }
        .parcelas-farm-header { border-bottom: 1px solid #eef2f7; padding: 0.8rem 1rem; display: flex; align-items: center; justify-content: space-between; }
        .parcelas-farm-body { padding: 1rem; }
        .parcelas-plots-table { width: 100%; border-collapse: collapse; }
        .parcelas-plots-table thead { border-bottom: 1.5px solid #eef2f7; }
        .parcelas-plots-table th { padding: 9px 10px; text-align: left; font-size: 0.68rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.08em; }
        .parcelas-plots-table td { padding: 9px 10px; border-bottom: 1px solid #f1f5f9; font-size: 0.88rem; color: #0f172a; }
        .parcelas-plots-table tbody tr:hover { background: #f8fafc; }
        .parcelas-select-btn { padding: 4px 10px; border-radius: 999px; border: 1px solid #dbe4ee; background: #fff; color: #16a34a; font-size: 0.68rem; font-weight: 700; cursor: pointer; transition: all 0.12s; white-space: nowrap; }
        .parcelas-select-btn:hover { background: #f0fdf4; border-color: #22c55e; }
        .parcelas-empty-state { text-align: center; padding: 2rem 1rem; color: #94a3b8; }
        .session-card { position: relative; }
        .session-card:hover .session-actions, .session-card:focus-within .session-actions, .session-card.menu-open .session-actions { opacity: 1; pointer-events: auto; transform: translateY(-50%) scale(1); }
        .session-actions { position: absolute; top: 50%; right: 0.7rem; transform: translateY(-50%) scale(0.98); opacity: 0; pointer-events: none; transition: opacity 0.14s ease, transform 0.14s ease; }
        .session-dot-btn { width: 1.85rem; height: 1.85rem; border-radius: 9999px; background: rgba(255,255,255,.96); border: 1px solid #e5e7eb; display: inline-flex; flex-direction: column; align-items: center; justify-content: center; box-shadow: none; cursor: pointer; }
        .session-dot-btn span { display: block; width: 4px; height: 4px; border-radius: 9999px; background: #64748b; margin: 1px 0; }
        .session-menu-overlay { position: fixed; inset: 0; z-index: 180; display: none; background: transparent; }
        .session-menu-overlay.open { display: block; }
        .session-menu { position: fixed; z-index: 190; min-width: 196px; border-radius: 18px; background: #fff; border: 1px solid #eef2f7; box-shadow: 0 24px 48px rgba(15,23,42,.18); padding: 0.35rem; }
        .session-menu-item { width: 100%; display: flex; align-items: center; gap: 0.7rem; padding: 0.72rem 0.8rem; border-radius: 14px; text-align: left; transition: background 0.14s ease, color 0.14s ease; background: transparent; border: none; cursor: pointer; }
        .session-menu-item:hover { background: #f8fafc; }
        .session-pin { display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.62rem; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: #15803d; background: #dcfce7; border-radius: 9999px; padding: 0.18rem 0.45rem; }
        .delete-overlay { position: fixed; inset: 0; z-index: 220; display: none; align-items: center; justify-content: center; padding: 1rem; background: rgba(15, 23, 42, .36); backdrop-filter: blur(1px); }
        .delete-overlay.open { display: flex; }
        .delete-modal { width: min(100%, 420px); border-radius: 24px; background: #fff; border: 1px solid #eef2f7; box-shadow: 0 24px 48px rgba(15, 23, 42, .18); overflow: hidden; }
        .delete-modal-title { font-size: 1rem; font-weight: 700; color: #0f172a; }
        .delete-modal-text { font-size: 0.9rem; color: #64748b; }
        .delete-modal-actions { display: flex; gap: 0.75rem; justify-content: flex-end; }
        .delete-btn { min-width: 108px; padding: 0.78rem 1rem; border-radius: 14px; font-size: 0.9rem; font-weight: 600; transition: all 0.14s; border: none; cursor: pointer; }
        .delete-btn-secondary { background: #fff; color: #334155; border: 1px solid #e2e8f0; }
        .delete-btn-secondary:hover { background: #f8fafc; }
        .delete-btn-danger { background: #ef4444; color: #fff; border: 1px solid #ef4444; }
        .delete-btn-danger:hover { background: #dc2626; }
      `}</style>

      {/* DRAWER OVERLAY */}
      <div id="drawerOverlay" className={sidebarOpen ? 'open' : ''} onClick={closeSidebar}></div>

      {/* USER MENU */}
      {menuOpen && (
        <div id="userMenu" ref={menuRef} style={{ position: 'fixed', zIndex: 200, width: '383px', background: '#fff', borderRadius: '18px', overflow: 'hidden', border: '1px solid #f3f4f6', boxShadow: '0 24px 48px rgba(15, 23, 42, .18)', left: menuPos.left + 'px', bottom: menuPos.bottom + 'px', top: 'auto' }}>
          <div className="flex items-center justify-between px-5 pt-4 pb-2 gap-2">
            <p className="text-[0.75rem] font-medium text-gray-500 truncate text-center w-full">{userEmail}</p>
          </div>
          <div className="flex flex-col items-center px-6 pt-1 pb-6">
            <div className="mb-3 flex-shrink-0" style={{ padding: 3, background: 'linear-gradient(135deg,#16a34a,#4ade80)', borderRadius: '9999px', boxShadow: '0 4px 18px rgba(22,163,74,.25)' }}>
              <div className="w-[78px] h-[78px] rounded-full overflow-hidden bg-white p-0.5">
                {profilePhotoUrl ? <img src={profilePhotoUrl} alt="Avatar" className="w-full h-full rounded-full object-cover select-none" /> : <div className="w-full h-full rounded-full flex items-center justify-center text-2xl font-bold text-white select-none brand-avatar">{initials}</div>}
              </div>
            </div>
            <p className="text-[1.1rem] font-semibold text-gray-800 mb-0.5">¡Hola, {displayName.split(' ')[0]}!</p>
            <p className="text-[0.72rem] text-gray-400 mb-4 text-center">{displayName}</p>
            <button onClick={openProfileModal} className="w-full text-center border border-brand-600 text-brand-700 rounded-full py-2 px-4 text-[0.82rem] font-medium hover:bg-brand-50 active:bg-brand-100 transition-colors cursor-pointer" style={{ background: 'none' }}>
              Gestionar mi perfil
            </button>
          </div>
          <div className="h-px bg-gray-100"></div>
          <div className="py-1.5">
            <div onClick={openProfileModal} className="um-option group">
              <div className="um-icon bg-gray-100 text-gray-500 group-hover:bg-brand-100 group-hover:text-brand-600"><i className="fas fa-user"></i></div>
              <div><p className="text-sm font-medium text-gray-700 leading-tight">Perfil</p><p className="text-[0.68rem] text-gray-400 mt-0.5">Ver y editar tu perfil</p></div>
            </div>
            <div onClick={openSettingsModal} className="um-option group">
              <div className="um-icon bg-gray-100 text-gray-500 group-hover:bg-brand-100 group-hover:text-brand-600"><i className="fas fa-gear"></i></div>
              <div><p className="text-sm font-medium text-gray-700 leading-tight">Configuraciones</p><p className="text-[0.68rem] text-gray-400 mt-0.5">Preferencias y ajustes</p></div>
            </div>
          </div>
          <div className="h-px bg-gray-100"></div>
          <div className="py-1.5">
            <div onClick={handleLogout} className="um-option group">
              <div className="um-icon bg-red-50 text-red-400 group-hover:bg-red-100 group-hover:text-red-500"><i className="fas fa-arrow-right-from-bracket"></i></div>
              <p className="text-sm font-semibold text-red-500">Cerrar sesion</p>
            </div>
          </div>
          <div className="h-px bg-gray-100"></div>
          <div className="py-3 flex items-center justify-center gap-2.5">
            <a href="#" className="text-[0.63rem] text-gray-400 hover:text-gray-600 hover:underline transition-colors">Politica de privacidad</a>
            <span className="text-gray-300 select-none text-xs">·</span>
            <a href="#" className="text-[0.63rem] text-gray-400 hover:text-gray-600 hover:underline transition-colors">Terminos de servicio</a>
          </div>
        </div>
      )}

      {/* SESSION MENU */}
      <div className={`session-menu-overlay ${sessionMenuState.open ? 'open' : ''}`} onClick={closeSessionMenu}></div>
      {sessionMenuState.open && (
        <div className="session-menu" style={{ left: sessionMenuState.left + 'px', top: sessionMenuState.top + 'px' }}>
          <button className="session-menu-item" onClick={() => togglePinConversation(sessionMenuState.sessionId)}>
            <span className="w-4 h-4 flex items-center justify-center text-gray-500"><i className="fas fa-thumbtack text-[0.72rem]"></i></span>
            <span className="text-sm text-gray-700 font-medium">{getConvPinState(sessionMenuState.sessionId) ? 'Desfijar' : 'Fijar'} conversacion</span>
          </button>
          <button className="session-menu-item" onClick={() => openDeleteConvModal(sessionMenuState.sessionId)}>
            <span className="w-4 h-4 flex items-center justify-center text-gray-500"><i className="fas fa-trash text-[0.72rem]"></i></span>
            <span className="text-sm text-gray-700 font-medium">Eliminar conversacion</span>
          </button>
        </div>
      )}

      {/* DELETE CONVERSATION MODAL */}
      <div className={`delete-overlay ${confirmDeleteConv ? 'open' : ''}`} onClick={() => setConfirmDeleteConv(null)}>
        <div className="delete-modal" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
          <div className="px-6 pt-6 pb-4">
            <h3 className="delete-modal-title">¿Eliminar conversacion?</h3>
            <p className="delete-modal-text mt-3">Se eliminaran las peticiones, las respuestas y los comentarios de tu ajuste, ademas de cualquier contenido que hayas creado.</p>
          </div>
          <div className="px-6 pb-6">
            <div className="delete-modal-actions">
              <button className="delete-btn delete-btn-secondary" onClick={() => setConfirmDeleteConv(null)}>Cancelar</button>
              <button className="delete-btn delete-btn-danger" onClick={handleDeleteConversation}>Eliminar</button>
            </div>
          </div>
        </div>
      </div>

      {/* LAYOUT */}
      <div className="h-screen flex overflow-hidden bg-white">
        {/* SIDEBAR */}
        <aside id="sidebar" className={sidebarOpen ? 'open' : ''}>
          <svg className="botanical-bg" viewBox="0 0 220 280" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M40 270 C 40 190, 80 160, 65 70" stroke="#16a34a" strokeWidth="2" fill="none" strokeLinecap="round" />
            <path d="M65 70 C 65 70, 20 50, 8 15" stroke="#16a34a" strokeWidth="1.2" fill="none" strokeLinecap="round" />
            <path d="M65 70 C 65 70, 115 45, 130 8" stroke="#16a34a" strokeWidth="1.2" fill="none" strokeLinecap="round" />
            <path d="M52 155 C 52 155, 8 142, -8 122" stroke="#16a34a" strokeWidth="1" fill="none" strokeLinecap="round" />
            <path d="M52 155 C 52 155, 96 130, 120 112" stroke="#16a34a" strokeWidth="1" fill="none" strokeLinecap="round" />
            <ellipse cx="130" cy="8" rx="13" ry="7.5" fill="#16a34a" opacity=".55" transform="rotate(-30 130 8)" />
            <ellipse cx="-8" cy="122" rx="11" ry="6" fill="#16a34a" opacity=".55" transform="rotate(20 -8 122)" />
            <ellipse cx="120" cy="112" rx="12" ry="6.5" fill="#16a34a" opacity=".55" transform="rotate(-15 120 112)" />
          </svg>
          <div className="flex items-center gap-2 mb-1" style={{ position: 'relative', zIndex: 1 }}>
            <div className="brand-avatar w-8 h-8 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
              <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24"><path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 2-8 2 4-4 8.5-4 8.5-4-8 3.5-9 6-9 6A8 8 0 0 1 17 8z" /></svg>
            </div>
            <span className="font-cormorant font-semibold text-base text-gray-900">Pitahaya Vision</span>
          </div>
          <button onClick={openParcelasModal} className="sidebar-btn" style={{ position: 'relative', zIndex: 1 }}>
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d="M15 22a1 1 0 0 1-1-1v-4a1 1 0 0 1 .445-.832l3-2a1 1 0 0 1 1.11 0l3 2A1 1 0 0 1 22 17v4a1 1 0 0 1-1 1z" /><path d="M18 10a8 8 0 0 0-16 0c0 4.993 5.539 10.193 7.399 11.799a1 1 0 0 0 .601.2" /><path d="M18 22v-3" /><circle cx="10" cy="10" r="3" />
            </svg>
            Mis parcelas
          </button>
          <button onClick={() => navigate('/historial')} className="sidebar-btn" style={{ position: 'relative', zIndex: 1 }}>
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 12h18" /><path d="M7 6h10" /><path d="M7 18h10" /></svg>
            Historial de analisis
          </button>
          <button onClick={newChat} className="sidebar-btn" style={{ position: 'relative', zIndex: 1 }}>
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            Nueva conversacion
          </button>
          <p className="text-[0.68rem] font-semibold uppercase tracking-widest text-gray-400 mt-1 px-1" style={{ position: 'relative', zIndex: 1 }}>Recientes</p>
          <div id="historyList" className="flex flex-col gap-1 overflow-y-auto flex-1" style={{ position: 'relative', zIndex: 1 }}>
            {sortedConversations.length === 0 ? (
              <p className="text-xs text-gray-300 px-2">Sin conversaciones aun</p>
            ) : (
              sortedConversations.map(conv => (
                <div key={conv.id} className={`session-card rounded-xl border transition w-full cursor-pointer ${activeConvId === conv.id ? 'bg-brand-50 border-brand-200 text-brand-800 shadow-sm' : 'bg-white border-transparent text-gray-500 hover:bg-brand-50 hover:text-brand-700'}`} onClick={() => selectConversation(conv)}>
                  <div className="flex items-start justify-between gap-2 px-3 py-2.5 pr-12">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <p className={`text-xs font-semibold truncate ${activeConvId === conv.id ? 'text-brand-800' : 'text-gray-700'}`}>{esc(conv.title || 'Nueva conversacion')}</p>
                        {conv.pinnedAt ? <span className="session-pin"><i className="fas fa-thumbtack text-[0.55rem]"></i> Fijada</span> : null}
                      </div>
                      <p className={`text-[0.68rem] mt-0.5 truncate ${activeConvId === conv.id ? 'text-brand-700/80' : 'text-gray-400'}`}>{conv.preview || 'Sesion en blanco'}</p>
                    </div>
                    <span className={`text-[0.62rem] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${activeConvId === conv.id ? 'text-brand-700 bg-brand-100' : 'text-gray-400 bg-gray-100'}`}>{conv.messages?.length || 0} msg</span>
                  </div>
                  <div className="session-actions">
                    <button className="session-dot-btn" onClick={(e) => { e.stopPropagation(); openSessionMenu(conv.id, e.currentTarget) }} aria-label="Mas opciones">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-gray-500"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="border-t border-gray-100 pt-3 mt-1" style={{ position: 'relative', zIndex: 1 }}>
            <button id="userTrigger" ref={triggerRef} onClick={toggleUserMenu} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left group" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
              <div className="trigger-ring w-9 h-9 rounded-full flex-shrink-0 p-0.5" style={{ background: 'linear-gradient(135deg,#16a34a,#4ade80)', boxShadow: '0 0 0 2px white' }}>
                {profilePhotoUrl ? <img src={profilePhotoUrl} alt="Avatar" className="brand-avatar w-full h-full rounded-full object-cover select-none" /> : <div className="w-full h-full rounded-full flex items-center justify-center text-[0.6rem] font-bold text-white select-none brand-avatar">{initials}</div>}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[0.82rem] font-semibold text-gray-800 truncate leading-tight">{displayName}</p>
                <p className="text-[0.68rem] text-gray-400 truncate leading-tight">{userEmail}</p>
              </div>
              <i className={`fas fa-chevron-up text-[0.62rem] text-gray-400 flex-shrink-0 transition-transform duration-200 ${menuOpen ? 'rotate-0' : 'rotate-180'}`}></i>
            </button>
          </div>
        </aside>

        {/* MAIN */}
        <main className="flex-1 flex flex-col overflow-hidden bg-white min-w-0">
          <header className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
            <div className="flex items-center gap-3">
              <button id="menuBtn" onClick={openSidebar} className="p-2 -ml-1 rounded-xl hover:bg-brand-50 transition text-gray-500 active:bg-brand-100" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
              </button>
              <div className="brand-avatar w-8 h-8 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
                <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24"><path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 2-8 2 4-4 8.5-4 8.5-4-8 3.5-9 6-9 6A8 8 0 0 1 17 8z" /></svg>
              </div>
              <div>
                <h1 className="font-cormorant text-base font-semibold text-gray-900 leading-none">Pitahaya Vision</h1>
                <p className="text-[0.6rem] font-semibold uppercase tracking-widest text-brand-600 leading-none mt-0.5">Asistente inteligente</p>
              </div>
            </div>
            <button onClick={newChat} title="Nueva conversacion" className="p-2 rounded-xl hover:bg-brand-50 transition text-gray-400 hover:text-brand-600 active:bg-brand-100" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 102.13-9.36L1 10" /></svg>
            </button>
          </header>

          {/* CHAT AREA */}
          <div id="chatArea" ref={chatAreaRef} className="flex-1 overflow-y-auto px-3 sm:px-4 py-5 relative">
            {showWelcome && messages.length === 0 ? (
              <div id="welcome" className="flex flex-col items-center justify-center min-h-full text-center px-3">
                <svg className="absolute bottom-0 left-0 w-40 sm:w-52 opacity-[0.06] pointer-events-none" viewBox="0 0 220 280"><path d="M40 270 C 40 190, 80 160, 65 70" stroke="#16a34a" strokeWidth="2" fill="none" strokeLinecap="round" /><path d="M65 70 C 65 70, 20 50, 8 15" stroke="#16a34a" strokeWidth="1.2" fill="none" strokeLinecap="round" /><path d="M65 70 C 65 70, 115 45, 130 8" stroke="#16a34a" strokeWidth="1.2" fill="none" strokeLinecap="round" /><path d="M52 155 C 52 155, 8 142, -8 122" stroke="#16a34a" strokeWidth="1" fill="none" strokeLinecap="round" /><path d="M52 155 C 52 155, 96 130, 120 112" stroke="#16a34a" strokeWidth="1" fill="none" strokeLinecap="round" /><ellipse cx="130" cy="8" rx="13" ry="7.5" fill="#16a34a" opacity=".55" transform="rotate(-30 130 8)" /><ellipse cx="-8" cy="122" rx="11" ry="6" fill="#16a34a" opacity=".55" transform="rotate(20 -8 122)" /><ellipse cx="120" cy="112" rx="12" ry="6.5" fill="#16a34a" opacity=".55" transform="rotate(-15 120 112)" /></svg>
                <svg className="absolute bottom-0 right-0 w-40 sm:w-52 opacity-[0.06] pointer-events-none scale-x-[-1]" viewBox="0 0 220 280"><path d="M40 270 C 40 190, 80 160, 65 70" stroke="#16a34a" strokeWidth="2" fill="none" strokeLinecap="round" /><path d="M65 70 C 65 70, 20 50, 8 15" stroke="#16a34a" strokeWidth="1.2" fill="none" strokeLinecap="round" /><path d="M65 70 C 65 70, 115 45, 130 8" stroke="#16a34a" strokeWidth="1.2" fill="none" strokeLinecap="round" /><path d="M52 155 C 52 155, 8 142, -8 122" stroke="#16a34a" strokeWidth="1" fill="none" strokeLinecap="round" /><path d="M52 155 C 52 155, 96 130, 120 112" stroke="#16a34a" strokeWidth="1" fill="none" strokeLinecap="round" /><ellipse cx="130" cy="8" rx="13" ry="7.5" fill="#16a34a" opacity=".55" transform="rotate(-30 130 8)" /><ellipse cx="-8" cy="122" rx="11" ry="6" fill="#16a34a" opacity=".55" transform="rotate(20 -8 122)" /><ellipse cx="120" cy="112" rx="12" ry="6.5" fill="#16a34a" opacity=".55" transform="rotate(-15 120 112)" /></svg>
                <div className="brand-avatar w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shadow-lg shadow-green-600/20 mb-4">
                  <svg className="w-7 h-7 sm:w-8 sm:h-8 fill-white" viewBox="0 0 24 24"><path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 2-8 2 4-4 8.5-4 8.5-4-8 3.5-9 6-9 6A8 8 0 0 1 17 8z" /></svg>
                </div>
                <p className="text-[0.65rem] font-bold uppercase tracking-widest text-brand-600 mb-2">Sistema de diagnostico inteligente</p>
                <h2 className="font-cormorant text-3xl sm:text-4xl font-medium leading-tight text-gray-900 mb-1">Hola, ¿como puedo<br /><em className="italic text-brand-600">ayudarte hoy?</em></h2>
                <p className="text-gray-400 text-sm mt-2 mb-6 font-light">Escribe, habla o envia una imagen de tu cultivo.</p>
                <div className="chips-grid w-full max-w-md">
                  <button onClick={() => suggest('¿Cuales son las enfermedades mas comunes de la pitahaya?')} className="chip text-left px-3 sm:px-4 py-3 rounded-2xl border border-gray-200 bg-white transition-all text-sm hover:shadow-sm active:scale-[.97]">
                    <div className="text-lg sm:text-xl mb-1">🌵</div><div className="font-medium text-gray-800 text-xs">Enfermedades comunes</div><div className="text-gray-400 text-xs mt-0.5">Diagnostico de cultivos</div>
                  </button>
                  <button onClick={() => suggest('¿Como puedo mejorar el rendimiento de mi cultivo de pitahaya?')} className="chip text-left px-3 sm:px-4 py-3 rounded-2xl border border-gray-200 bg-white transition-all text-sm hover:shadow-sm active:scale-[.97]">
                    <div className="text-lg sm:text-xl mb-1">📈</div><div className="font-medium text-gray-800 text-xs">Mejorar rendimiento</div><div className="text-gray-400 text-xs mt-0.5">Optimizacion agricola</div>
                  </button>
                  <button onClick={() => suggest('¿Que plagas afectan a la pitahaya y como controlarlas?')} className="chip text-left px-3 sm:px-4 py-3 rounded-2xl border border-gray-200 bg-white transition-all text-sm hover:shadow-sm active:scale-[.97]">
                    <div className="text-lg sm:text-xl mb-1">🐛</div><div className="font-medium text-gray-800 text-xs">Control de plagas</div><div className="text-gray-400 text-xs mt-0.5">Proteccion del cultivo</div>
                  </button>
                  <button onClick={() => suggest('¿Cual es el mejor sistema de riego para pitahaya?')} className="chip text-left px-3 sm:px-4 py-3 rounded-2xl border border-gray-200 bg-white transition-all text-sm hover:shadow-sm active:scale-[.97]">
                    <div className="text-lg sm:text-xl mb-1">💧</div><div className="font-medium text-gray-800 text-xs">Sistema de riego</div><div className="text-gray-400 text-xs mt-0.5">Gestion del agua</div>
                  </button>
                </div>
              </div>
            ) : (
              <div id="msgs" className="max-w-2xl mx-auto flex flex-col gap-4 sm:gap-5">
                {messages.map((msg, i) => (
                  <div key={i}>
                    {msg.role === 'user' ? (
                      <div className="flex justify-end animate-fade-up">
                        <div className="text-right">
                          {msg.image_path && <img src={msg.image_path} alt="Preview" className="max-w-[75vw] sm:max-w-xs w-full rounded-2xl mb-2 block ml-auto shadow-sm" style={{ maxHeight: '200px', objectFit: 'cover' }} />}
                          {msg.content && <div className="user-bubble text-white text-sm px-4 py-3 rounded-3xl rounded-tr-md leading-relaxed shadow-sm max-w-[80vw] sm:max-w-sm">{esc(msg.content)}</div>}
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2 sm:gap-3 items-start animate-fade-up">
                        <div className="brand-avatar w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-1 shadow-sm">
                          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-white" viewBox="0 0 24 24"><path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 2-8 2 4-4 8.5-4 8.5-4-8 3.5-9 6-9 6A8 8 0 0 1 17 8z" /></svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="bot-text text-gray-800 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: formatBotText(msg.content) }}></div>
                          <div className="flex gap-1 mt-2">
                            <button onClick={() => handleCopy(msg.content, i)} className="action-btn p-1.5 rounded-lg transition text-gray-400" title="Copiar" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                              {copiedIndex === i ? (
                                <svg className="w-3.5 h-3.5 text-brand-600" fill="none" stroke="#16a34a" strokeWidth="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                              ) : (
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                              )}
                            </button>
                            <button className="action-btn p-1.5 rounded-lg transition text-gray-400" title="Util" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3z"/><path d="M7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"/></svg>
                            </button>
                            <button className="action-btn p-1.5 rounded-lg transition text-gray-400" title="No util" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3z"/><path d="M17 2h2.67A2.31 2.31 0 0122 4v7a2.31 2.31 0 01-2.33 2H17"/></svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {sending && (
                  <div className="flex gap-2 sm:gap-3 items-start animate-fade-up">
                    <div className="brand-avatar w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-1 shadow-sm">
                      <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-white" viewBox="0 0 24 24"><path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 2-8 2 4-4 8.5-4 8.5-4-8 3.5-9 6-9 6A8 8 0 0 1 17 8z" /></svg>
                    </div>
                    <div className="flex items-center gap-1.5 bg-brand-50 border border-brand-100 px-4 py-3 rounded-3xl rounded-tl-md h-10">
                      <div className="w-[7px] h-[7px] rounded-full bg-brand-500 animate-dot"></div>
                      <div className="w-[7px] h-[7px] rounded-full bg-brand-500 animate-dot-2"></div>
                      <div className="w-[7px] h-[7px] rounded-full bg-brand-500 animate-dot-3"></div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* INPUT ZONE */}
          <div className="input-zone px-3 sm:px-4 pt-2 bg-white border-t border-gray-100 flex-shrink-0">
            <div className="max-w-2xl mx-auto">
              <div id="imgPreview" className={`${imagePreview ? 'flex' : 'hidden'} items-center gap-3 mb-3 px-1`}>
                <div className="relative">
                  <img id="previewImg" src={imagePreview || ''} alt="preview" className="h-14 w-14 sm:h-16 sm:w-16 object-cover rounded-2xl border border-brand-200 shadow-sm" />
                  <button onClick={removeImage} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gray-700 hover:bg-gray-900 rounded-full flex items-center justify-center transition" style={{ border: 'none', cursor: 'pointer' }}>
                    <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                  </button>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-600" id="imgName">{imageFile?.name || 'imagen.jpg'}</p>
                  <p className="text-xs text-gray-400">Imagen lista para enviar</p>
                </div>
              </div>
              <div className="input-box flex items-end gap-1.5 sm:gap-2 bg-gray-50 border border-gray-200 rounded-3xl px-2.5 sm:px-3 py-2.5 sm:py-3 transition-all duration-200">
                <button onClick={() => fileInputRef.current?.click()} title="Adjuntar imagen" className="flex-shrink-0 mb-0.5 p-1.5 rounded-full hover:bg-brand-50 active:bg-brand-100 transition text-gray-400 hover:text-brand-600" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                </button>
                <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleImageSelect} />
                <textarea ref={inpRef} value={inputValue} onChange={e => setInputValue(e.target.value)} onKeyDown={handleKeyDown} rows="1" placeholder="Escribe sobre tu cultivo..." className="flex-1 text-sm text-gray-800 placeholder-gray-400 leading-relaxed max-h-32 overflow-y-auto py-0.5"></textarea>
                <button ref={micRef} onClick={toggleMic} title="Usar microfono" className="flex-shrink-0 mb-0.5 w-8 h-8 rounded-full bg-gray-100 hover:bg-brand-50 active:bg-brand-100 flex items-center justify-center transition-all duration-200" style={{ border: 'none', cursor: 'pointer' }}>
                  <svg ref={micIconRef} className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" /><path d="M19 10v2a7 7 0 01-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>
                  <div ref={micWaveRef} className="hidden items-center gap-0.5">
                    <div className="wb animate-wave-1"></div>
                    <div className="wb animate-wave-2"></div>
                    <div className="wb animate-wave-3"></div>
                    <div className="wb animate-wave-4"></div>
                    <div className="wb animate-wave-5"></div>
                  </div>
                </button>
                <button onClick={handleSendMessage} disabled={!inputValue.trim() && !imageFile} className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mb-0.5 transition-all duration-200 ${(inputValue.trim() || imageFile) && !sending ? 'send-active' : 'send-inactive'}`} style={{ border: 'none' }}>
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
                </button>
              </div>
              <p className="text-center text-[0.65rem] text-gray-400 mt-2 mb-1 font-light">El asistente puede cometer errores. Verifica con un agronomo.</p>
            </div>
          </div>
        </main>
      </div>

      {/* PROFILE MODAL */}
      <div className={`context-overlay ${showProfileModal ? 'open' : ''}`} onClick={() => setShowProfileModal(false)}>
        <div className="context-modal" onClick={e => e.stopPropagation()}>
          <div className="context-modal-header px-5 py-5 sm:px-8 sm:py-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="context-badge">Perfil de usuario</span>
                <h3 className="font-cormorant text-2xl sm:text-3xl font-semibold text-gray-900 mt-3 leading-tight">Informacion personal</h3>
                <p className="text-sm text-gray-500 mt-2 max-w-2xl leading-relaxed">Mantén tus datos actualizados y administra tu cuenta desde un solo panel.</p>
              </div>
              <button onClick={() => setShowProfileModal(false)} className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 transition flex items-center justify-center text-gray-500" style={{ border: 'none', cursor: 'pointer' }}><i className="fas fa-xmark"></i></button>
            </div>
          </div>
          <div className="context-modal-body px-4 sm:px-6 py-5">
            <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
              <aside className="flex flex-col items-center text-center h-fit">
                <div className="context-section w-full flex flex-col items-center text-center">
                  <div className="relative inline-flex mb-3">
                    <div style={{ padding: 3, background: 'linear-gradient(135deg,#16a34a,#4ade80)', borderRadius: '9999px', boxShadow: '0 4px 18px rgba(22,163,74,.25)' }}>
                      <div className="w-28 h-28 rounded-full overflow-hidden bg-white p-0.5">
                        {(profilePhotoPreview || profilePhotoUrl) ? <img src={profilePhotoPreview || profilePhotoUrl} alt="Avatar" className="w-full h-full rounded-full object-cover border-[3px] border-brand-500" /> : <div className="w-full h-full brand-avatar rounded-full flex items-center justify-center text-3xl font-bold text-white">{initials}</div>}
                      </div>
                    </div>
                    <span className="absolute bottom-1 right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-brand-500 text-white shadow-sm"><i className="fas fa-check text-[0.65rem]"></i></span>
                  </div>
                  <h2 className="text-lg font-semibold text-slate-900">{displayName}</h2>
                  <p className="text-sm text-slate-500">@{user?.username}</p>
                  <div className="mt-5 w-full">
                    <input id="profilePhotoInput" type="file" accept="image/*" className="hidden" onChange={handleProfilePhotoSelect} />
                    <label htmlFor="profilePhotoInput" className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-500 transition-colors hover:border-brand-600 hover:bg-brand-50 hover:text-brand-600"><i className="fas fa-cloud-arrow-up text-base"></i><span>Cambiar foto</span></label>
                  </div>
                  <div className="mt-5 w-full space-y-2">
                    <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5"><span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Usuario</span><span className="text-sm font-semibold text-slate-800">{user?.username}</span></div>
                    <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5"><span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Rol</span><span className="text-sm font-semibold text-brand-600">{roleLabel}</span></div>
                  </div>
                </div>
              </aside>
              <form className="space-y-5" onSubmit={handleUpdateProfile}>
                <div className="context-section">
                  <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400"><i className="fas fa-envelope text-slate-300"></i><span>Datos de cuenta</span><div className="h-px flex-1 bg-slate-200"></div></div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-600">Correo electronico</label>
                      <div className="relative rounded-xl border border-slate-200 bg-white focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20 transition-all">
                        <i className="fas fa-envelope absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400"></i>
                        <input type="email" value={profileForm.email} onChange={e => setProfileForm(p => ({ ...p, email: e.target.value }))} className="w-full rounded-xl border-0 bg-transparent py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none" />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-600">Telefono</label>
                      <div className="relative rounded-xl border border-slate-200 bg-white focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20 transition-all">
                        <i className="fas fa-phone absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400"></i>
                        <input type="tel" maxLength={10} value={profileForm.phone} onChange={e => setProfileForm(p => ({ ...p, phone: e.target.value }))} className="w-full rounded-xl border-0 bg-transparent py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none" />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="context-section">
                  <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400"><i className="fas fa-user text-slate-300"></i><span>Datos personales</span><div className="h-px flex-1 bg-slate-200"></div></div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-600">Nombre</label>
                      <div className="relative rounded-xl border border-slate-200 bg-white focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20 transition-all">
                        <i className="fas fa-user absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400"></i>
                        <input type="text" value={profileForm.first_name} onChange={e => setProfileForm(p => ({ ...p, first_name: e.target.value }))} className="w-full rounded-xl border-0 bg-transparent py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none" />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-600">Apellido</label>
                      <div className="relative rounded-xl border border-slate-200 bg-white focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20 transition-all">
                        <i className="fas fa-user absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400"></i>
                        <input type="text" value={profileForm.last_name} onChange={e => setProfileForm(p => ({ ...p, last_name: e.target.value }))} className="w-full rounded-xl border-0 bg-transparent py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none" />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-600">Cedula</label>
                      <div className="relative rounded-xl border border-slate-200 bg-white focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20 transition-all">
                        <i className="fas fa-id-card absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400"></i>
                        <input type="text" maxLength={10} value={profileForm.dni} onChange={e => setProfileForm(p => ({ ...p, dni: e.target.value }))} className="w-full rounded-xl border-0 bg-transparent py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none" />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-600">Direccion</label>
                      <div className="relative rounded-xl border border-slate-200 bg-white focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20 transition-all">
                        <i className="fas fa-location-dot absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400"></i>
                        <input type="text" placeholder="Av. principal..." className="w-full rounded-xl border-0 bg-transparent py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none" />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-3 pt-1">
                  <button type="button" onClick={() => setShowProfileModal(false)} className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-brand-500 hover:bg-brand-50 hover:text-brand-700 cursor-pointer">Cancelar</button>
                  <button type="submit" className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-green-600/20 transition-all hover:-translate-y-0.5 hover:bg-brand-700 hover:shadow-lg active:translate-y-0 cursor-pointer" style={{ border: 'none' }}><i className="fas fa-floppy-disk mr-1.5"></i>Guardar cambios</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* SETTINGS MODAL */}
      <div className={`context-overlay ${showSettingsModal ? 'open' : ''}`} onClick={() => setShowSettingsModal(false)}>
        <div className="context-modal" onClick={e => e.stopPropagation()}>
          <div className="context-modal-header px-5 py-5 sm:px-8 sm:py-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="context-badge">Configuraciones</span>
                <h3 className="font-cormorant text-2xl sm:text-3xl font-semibold text-gray-900 mt-3 leading-tight">Configuraciones y accesibilidad</h3>
                <p className="text-sm text-gray-500 mt-2 max-w-2xl leading-relaxed">Personaliza la experiencia de la plataforma y administra las opciones de ubicacion para el formulario de analisis.</p>
              </div>
              <button onClick={() => setShowSettingsModal(false)} className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 transition flex items-center justify-center text-gray-500" style={{ border: 'none', cursor: 'pointer' }}><i className="fas fa-xmark"></i></button>
            </div>
          </div>
          <div className="context-modal-body px-4 sm:px-6 py-5 space-y-5">
            <div className="context-section">
              <div className="mb-4">
                <p className="context-section-title">Configuraciones generales</p>
                <p className="text-sm text-slate-500 mt-1">Personaliza la apariencia y el comportamiento de la plataforma.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <label className="block"><span className="block text-sm font-medium text-slate-700 mb-2">Tema de la interfaz</span><select ref={settingsThemeRef} className="context-select"><option value="light">Claro</option><option value="dark">Oscuro</option><option value="system">Segun el sistema</option></select></label>
                <label className="block"><span className="block text-sm font-medium text-slate-700 mb-2">Tamaño de texto</span><select ref={settingsFontSizeRef} className="context-select"><option value="small">Pequeño</option><option value="medium">Mediano</option><option value="large">Grande</option></select></label>
                <label className="block"><span className="block text-sm font-medium text-slate-700 mb-2">Tipo de letra</span><select ref={settingsFontFamilyRef} className="context-select"><option value="inter">Inter (predeterminada)</option><option value="lexend">Lexend</option><option value="opendyslexic">OpenDyslexic</option><option value="roboto">Roboto</option><option value="comic-neue">Comic Neue</option><option value="courier-prime">Courier Prime</option><option value="atkinson">Atkinson Hyperlegible</option><option value="times-new-roman">Times New Roman</option></select></label>
              </div>
            </div>
            <div className="context-section">
              <div className="mb-4">
                <p className="context-section-title">Accesibilidad del chat</p>
                <p className="text-sm text-slate-500 mt-1">Controla como el chatbot presenta y entrega sus respuestas.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <label className="block"><span className="block text-sm font-medium text-slate-700 mb-2">Modo de daltonismo</span><select ref={settingsColorBlindRef} className="context-select"><option value="none">Normal</option><option value="protanopia">Protanopia (dificultad rojo)</option><option value="deuteranopia">Deuteranopia (dificultad verde)</option><option value="tritanopia">Tritanopia (dificultad azul)</option></select></label>
              </div>
            </div>
            <div className="context-section">
              <div className="mb-4">
                <p className="context-section-title">Accesibilidad visual</p>
                <p className="text-sm text-slate-500 mt-1">Opciones visuales y de interaccion adicionales.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <label className="block flex items-start gap-3 pt-6"><input type="checkbox" ref={settingsHighContrastRef} className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500" /><div><span className="block text-sm font-medium text-slate-700">Alto contraste</span><p className="text-xs text-slate-500 mt-0.5">Mejora la legibilidad de los elementos.</p></div></label>
                <label className="block flex items-start gap-3 pt-6"><input type="checkbox" ref={settingsReducedMotionRef} className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500" /><div><span className="block text-sm font-medium text-slate-700">Reducir animaciones</span><p className="text-xs text-slate-500 mt-0.5">Minimiza transiciones y movimientos.</p></div></label>
                <label className="block flex items-start gap-3 pt-6"><input type="checkbox" ref={settingsDyslexicFontRef} className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500" /><div><span className="block text-sm font-medium text-slate-700">Tipografia amigable</span><p className="text-xs text-slate-500 mt-0.5">Fuente disenada para dislexia.</p></div></label>
              </div>
            </div>
            <div className="context-section">
              <div className="mb-4">
                <p className="context-section-title">Opciones de ubicacion</p>
                <p className="text-sm text-slate-500 mt-1">Administra las opciones disponibles en los selects del formulario de contexto.</p>
              </div>
              {['lotId', 'zone', 'rows'].map(field => (
                <div key={field} className="settings-field mb-3">
                  <div className="settings-add-row">
                    <input ref={{ lotId: settingsLotInputRef, zone: settingsZoneInputRef, rows: settingsRowsInputRef }[field]} className="context-input" placeholder={`Agregar ${field === 'lotId' ? 'lote' : field === 'zone' ? 'zona' : 'parcela/hilera'}...`} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addContextOption(field) } }} />
                    <button className="settings-add-btn" onClick={() => addContextOption(field)} style={{ border: 'none', cursor: 'pointer' }}>Agregar</button>
                  </div>
                  <div className="settings-chip-list">
                    {contextOptions[field].length === 0 ? <p className="settings-empty">Todavia no hay opciones creadas.</p> : contextOptions[field].map((val, vi) => (
                      <span key={vi} className="settings-chip"><span>{val}</span><button onClick={() => removeContextOption(field, val)}>&times;</button></span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="context-section">
              <div className="mb-4">
                <p className="context-section-title">Respaldo de datos</p>
                <p className="text-sm text-slate-500 mt-1">Exporta o importa toda tu informacion (sesiones, analisis, configuraciones).</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button onClick={exportBackup} className="context-secondary-btn"><i className="fas fa-download mr-1.5"></i> Exportar respaldo</button>
                <label className="context-secondary-btn cursor-pointer inline-flex items-center gap-2"><i className="fas fa-upload"></i> Importar respaldo<input type="file" accept=".json" className="hidden" onChange={importBackup} /></label>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-3 pt-1">
              <button onClick={resetSettings} className="context-secondary-btn">Restaurar valores</button>
              <button onClick={() => setShowSettingsModal(false)} className="context-secondary-btn">Cerrar</button>
              <button onClick={handleSaveSettings} className="context-save-btn">Guardar configuraciones</button>
            </div>
          </div>
        </div>
      </div>

      {/* CONTEXT MODAL */}
      <div className={`context-overlay ${showContextModal ? 'open' : ''}`} onClick={() => setShowContextModal(false)}>
        <div className="context-modal" onClick={e => e.stopPropagation()}>
          <div className="context-modal-header px-5 py-5 sm:px-8 sm:py-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="context-badge">Contexto de conversacion</span>
                <h3 className="font-cormorant text-2xl sm:text-3xl font-semibold text-gray-900 mt-3 leading-tight">Registrar datos de la planta antes del escaneo</h3>
                <p className="text-sm text-gray-500 mt-2 max-w-2xl leading-relaxed">Guarda solo lo que ayuda a entender la planta enferma y a tomar decisiones futuras en el cultivo.</p>
              </div>
              <button onClick={() => setShowContextModal(false)} className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 transition flex items-center justify-center text-gray-500" style={{ border: 'none', cursor: 'pointer' }}><i className="fas fa-xmark"></i></button>
            </div>
            <div className="context-summary mt-5 grid gap-2 sm:grid-cols-2">
              <div><p className="text-[0.65rem] uppercase tracking-[0.18em] text-gray-400">Uso</p><p className="text-sm text-gray-700 mt-1">Conectar diagnostico, contexto del lote y resultado final.</p></div>
              <div><p className="text-[0.65rem] uppercase tracking-[0.18em] text-gray-400">Salida</p><p className="text-sm text-gray-700 mt-1">Datos listos para analisis historico de la planta.</p></div>
            </div>
          </div>
          <div className="context-modal-body px-4 sm:px-6 py-5">
            <form className="space-y-4" onSubmit={e => e.preventDefault()}>
              <div className="context-section">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div>
                    <p className="context-section-title">Identificacion de la planta</p>
                    <p className="text-sm text-slate-500 mt-1">Ubica con precision la planta afectada.</p>
                  </div>
                  <button type="button" onClick={() => { setShowContextModal(false); openParcelasModal() }} className="text-[0.7rem] font-semibold text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 transition px-3 py-1.5 rounded-full flex items-center gap-1.5 flex-shrink-0 cursor-pointer" style={{ border: 'none' }}>
                    <i className="fas fa-field" style={{ fontSize: '0.65rem' }}></i>Mis parcelas
                  </button>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <label className="block"><span className="block text-sm font-medium text-slate-700 mb-2">Fecha y hora</span><input type="datetime-local" ref={contextDatetimeRef} className="context-input" /></label>
                  <label className="block"><span className="block text-sm font-medium text-slate-700 mb-2">ID del lote o sector</span>
                    <select ref={contextLotRef} className="context-select" value={contextSelectedFarmId} onChange={e => { setContextSelectedFarmId(e.target.value); setContextSelectedZone('') }}>
                      <option value="">Seleccionar lote</option>
                      {farms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </select>
                  </label>
                  <label className="block"><span className="block text-sm font-medium text-slate-700 mb-2">Zona</span>
                    <select ref={contextZoneRef} className="context-select" value={contextSelectedZone} onChange={e => setContextSelectedZone(e.target.value)}>
                      <option value="">Seleccionar zona</option>
                      {farms.filter(f => String(f.id) === String(contextSelectedFarmId)).flatMap(f => (f.plots || []).filter((p, i, arr) => arr.findIndex(x => x.zone === p.zone) === i).map(p => <option key={p.zone} value={p.zone}>{p.zone || 'Sin zona'}</option>))}
                    </select>
                  </label>
                  <label className="block"><span className="block text-sm font-medium text-slate-700 mb-2">Parcela e hileras</span>
                    <select ref={contextRowsRef} className="context-select">
                      <option value="">Seleccionar parcela</option>
                      {farms.filter(f => String(f.id) === String(contextSelectedFarmId)).flatMap(f => (f.plots || []).filter(p => !contextSelectedZone || p.zone === contextSelectedZone).map(p => <option key={p.id} value={p.name}>{p.name}{p.rows ? ` (${p.rows})` : ''}</option>))}
                    </select>
                  </label>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mt-4">
                  <label className="block"><span className="block text-sm font-medium text-slate-700 mb-2">Planta / unidad</span><input type="text" ref={contextPlantRef} className="context-input" placeholder="Ej: Planta 0147, Unidad 12" /></label>
                  <label className="block lg:col-span-2"><span className="block text-sm font-medium text-slate-700 mb-2">GPS o ubicacion exacta</span><input type="text" ref={contextLocationRef} className="context-input" placeholder="Lat. -1.234567, Lon. -79.123456 o referencia en campo" /></label>
                </div>
              </div>
              <div className="context-section">
                <div className="mb-4">
                  <p className="context-section-title">Estado sanitario de la planta</p>
                  <p className="text-sm text-slate-500 mt-1">Describe lo mas importante que ves antes de escanear la imagen.</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <label className="block lg:col-span-2"><span className="block text-sm font-medium text-slate-700 mb-2">Sintoma principal</span><input type="text" ref={contextSymptomRef} className="context-input" placeholder="Manchas, clorosis, pudricion, marchitez, dano en tallo..." /></label>
                  <label className="block"><span className="block text-sm font-medium text-slate-700 mb-2">Organo afectado</span>
                    <select ref={contextPartRef} className="context-select"><option value="">Seleccionar</option><option>Tallo</option><option>Raiz</option><option>Cladodio / brazo</option><option>Flor</option><option>Fruto</option><option>Brote</option></select>
                  </label>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 mt-4">
                  <label className="block"><span className="block text-sm font-medium text-slate-700 mb-2">Fase fenologica</span>
                    <select ref={contextStageRef} className="context-select"><option value="">Seleccionar</option><option>Brotacion floral</option><option>Antesis (Floracion)</option><option>Amarre o Cuajado</option><option>Madurez y Cosecha</option></select>
                  </label>
                  <label className="block"><span className="block text-sm font-medium text-slate-700 mb-2">Severidad observada</span>
                    <select ref={contextSeverityRef} className="context-select"><option value="">Seleccionar</option><option>Baja</option><option>Moderada</option><option>Alta</option><option>Critica</option></select>
                  </label>
                </div>
                <div className="mt-4">
                  <label className="block"><span className="block text-sm font-medium text-slate-700 mb-2">Notas de campo</span><textarea ref={contextNotesRef} className="context-textarea" placeholder="Ejemplo: inicio despues del riego, la planta esta en borde del lote, hay humedad acumulada, se observo olor raro..."></textarea></label>
                </div>
              </div>
              <div className="context-section">
                <div className="mb-4">
                  <p className="context-section-title">Antecedentes minimos</p>
                  <p className="text-sm text-slate-500 mt-1">Solo lo necesario para explicar el estado actual de la planta.</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block"><span className="block text-sm font-medium text-slate-700 mb-2">Riego reciente</span><input type="text" ref={contextIrrigationRef} className="context-input" placeholder="Frecuencia, volumen o cambio reciente" /></label>
                  <label className="block"><span className="block text-sm font-medium text-slate-700 mb-2">Aplicacion fitosanitaria</span><input type="text" ref={contextPhytoRef} className="context-input" placeholder="Producto, fecha y motivo" /></label>
                </div>
              </div>
              <div className="context-section">
                <div className="flex flex-wrap gap-3 justify-end">
                  <button type="button" className="context-secondary-btn" onClick={() => {
                    if (contextDatetimeRef.current) contextDatetimeRef.current.value = ''
                    if (contextLotRef.current) contextLotRef.current.value = ''
                    if (contextZoneRef.current) contextZoneRef.current.value = ''
                    if (contextRowsRef.current) contextRowsRef.current.value = ''
                    if (contextPlantRef.current) contextPlantRef.current.value = ''
                    if (contextLocationRef.current) contextLocationRef.current.value = ''
                    if (contextSymptomRef.current) contextSymptomRef.current.value = ''
                    if (contextPartRef.current) contextPartRef.current.value = ''
                    if (contextStageRef.current) contextStageRef.current.value = ''
                    if (contextSeverityRef.current) contextSeverityRef.current.value = ''
                    if (contextIrrigationRef.current) contextIrrigationRef.current.value = ''
                    if (contextPhytoRef.current) contextPhytoRef.current.value = ''
                    if (contextNotesRef.current) contextNotesRef.current.value = ''
                  }}>Limpiar</button>
                  <button type="button" className="context-secondary-btn" onClick={() => setShowContextModal(false)}>Guardar</button>
                  <button type="button" className="context-save-btn" onClick={() => { setShowContextModal(false); setTimeout(() => fileInputRef.current?.click(), 300) }}>Guardar y cargar imagen</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* PARCELAS MODAL */}
      <div className={`context-overlay ${showParcelasModal ? 'open' : ''}`} onClick={closeParcelasModal}>
        <div className="context-modal" onClick={e => e.stopPropagation()}>
          <div className="context-modal-header px-5 py-5 sm:px-8 sm:py-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="context-badge">Gestion de propiedades</span>
                <h3 className="font-cormorant text-2xl sm:text-3xl font-semibold text-gray-900 mt-3 leading-tight">Mis Parcelas</h3>
                <p className="text-sm text-gray-500 mt-2 max-w-2xl leading-relaxed">Administra tus fincas y parcelas para asociarlas al contexto de analisis.</p>
              </div>
              <button onClick={closeParcelasModal} className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 transition flex items-center justify-center text-gray-500" style={{ border: 'none', cursor: 'pointer' }}><i className="fas fa-xmark"></i></button>
            </div>
          </div>
          <div className="context-modal-body px-4 sm:px-6 py-5">
            <div className="mb-5">
              <button onClick={openAddFarmModal} className="w-full py-3 bg-white border-2 border-dashed border-gray-300 rounded-2xl text-brand-600 font-semibold flex items-center justify-center gap-3 transition-all hover:border-brand-500 hover:bg-brand-50 cursor-pointer" style={{ background: 'none' }}><i className="fas fa-plus"></i>Agregar nueva finca</button>
            </div>
            <div id="parcelasFarmsList" className="space-y-4">
              {farms.length === 0 ? (
                <div className="parcelas-empty-state"><i className="fas fa-tree text-2xl mb-3 block"></i><p>Aun no has registrado ninguna finca.</p><p className="text-xs mt-1">Crea una finca para empezar a administrar tus parcelas.</p></div>
              ) : (
                farms.map(farm => (
                  <div key={farm.id} className="parcelas-farm-card">
                    <div className="parcelas-farm-header">
                      <div><p className="font-semibold text-gray-900 text-sm">{farm.name}</p><p className="text-xs text-gray-500">{farm.location || 'Sin ubicacion'}</p></div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => openAddPlotModal(farm)} className="parcelas-select-btn">+ Parcela</button>
                        <button onClick={() => handleDeleteFarm(farm.id)} className="text-xs text-red-400 hover:text-red-600 transition cursor-pointer" style={{ background: 'none', border: 'none' }}><i className="fas fa-trash"></i></button>
                      </div>
                    </div>
                    {farm.plots && farm.plots.length > 0 && (
                      <div className="parcelas-farm-body">
                        <table className="parcelas-plots-table">
                          <thead><tr><th>Parcela</th><th>Zona</th><th>Hilera</th><th>GPS</th><th>Hectareas</th><th></th></tr></thead>
                          <tbody>
                            {farm.plots.map(plot => (
                              <tr key={plot.id}>
                                <td className="font-medium">{plot.name}</td>
                                <td>{plot.zone || '---'}</td>
                                <td>{plot.rows || '---'}</td>
                                <td className="text-xs">{plot.gps_location || '---'}</td>
                                <td>{plot.hectares || '---'}</td>
                                <td>
                                  <div className="flex items-center gap-1">
                                    <button onClick={() => handleSelectPlot(plot, farm)} className="text-xs font-semibold text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 transition px-2 py-1 rounded-full cursor-pointer" style={{ border: 'none' }}><i className="fas fa-check mr-0.5"></i></button>
                                    <button onClick={() => handleDeletePlot(plot.id)} className="text-xs text-red-400 hover:text-red-600 transition cursor-pointer" style={{ background: 'none', border: 'none' }}><i className="fas fa-times"></i></button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ADD FARM MODAL */}
      <div className="fixed inset-0 z-[300]" style={{ display: showAddFarmModal ? 'flex' : 'none', background: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' }}>
        <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden mx-4" onClick={e => e.stopPropagation()}>
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h4 className="text-lg font-semibold text-gray-900">Agregar nueva finca</h4>
            <button onClick={() => setShowAddFarmModal(false)} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 transition flex items-center justify-center text-gray-500" style={{ border: 'none', cursor: 'pointer' }}><i className="fas fa-xmark"></i></button>
          </div>
          <div className="px-5 py-4 space-y-4">
            <div><label className="block text-sm font-medium text-slate-700 mb-2">Nombre de la finca</label><input type="text" className="context-input" placeholder="Ej: Finca El Paraiso" value={farmName} onChange={e => setFarmName(e.target.value)} /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-2">Ubicacion</label><input type="text" className="context-input" placeholder="Ej: Provincia del Oro, Machala" value={farmLocation} onChange={e => setFarmLocation(e.target.value)} /></div>
          </div>
          <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-3">
            <button onClick={() => setShowAddFarmModal(false)} className="context-secondary-btn">Cancelar</button>
            <button onClick={handleCreateFarm} className="context-save-btn">Agregar finca</button>
          </div>
        </div>
      </div>

      {/* ADD PLOT MODAL */}
      <div className="fixed inset-0 z-[300]" style={{ display: showAddPlotModal ? 'flex' : 'none', background: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' }}>
        <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden mx-4" onClick={e => e.stopPropagation()}>
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h4 className="text-lg font-semibold text-gray-900">Agregar nueva parcela</h4>
            <p className="text-sm text-gray-500">{selectedFarmForPlot?.name}</p>
            <button onClick={() => setShowAddPlotModal(false)} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 transition flex items-center justify-center text-gray-500" style={{ border: 'none', cursor: 'pointer' }}><i className="fas fa-xmark"></i></button>
          </div>
          <div className="px-5 py-4 space-y-4">
            <div><label className="block text-sm font-medium text-slate-700 mb-2">Parcela e hilera</label><input type="text" className="context-input" placeholder="Ej: Parcela A, Hilera 1-5" value={plotName} onChange={e => setPlotName(e.target.value)} /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-2">Zona</label><input type="text" className="context-input" placeholder="Ej: Zona norte" value={plotZone} onChange={e => setPlotZone(e.target.value)} /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-2">Hileras</label><input type="text" className="context-input" placeholder="Ej: 1-5" value={plotRows} onChange={e => setPlotRows(e.target.value)} /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-2">GPS o ubicacion exacta</label><input type="text" className="context-input" placeholder="Ej: Lat. -3.1234, Lon. -79.5678" value={plotGps} onChange={e => setPlotGps(e.target.value)} /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-2">Hectareas</label><input type="number" className="context-input" placeholder="Ej: 2.5" step="0.1" value={plotHectares} onChange={e => setPlotHectares(e.target.value)} /></div>
          </div>
          <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-3">
            <button onClick={() => setShowAddPlotModal(false)} className="context-secondary-btn">Cancelar</button>
            <button onClick={handleCreatePlot} className="context-save-btn">Agregar parcela</button>
          </div>
        </div>
      </div>

      {/* CONFIRM DELETE MODAL */}
      <div className={`delete-overlay ${confirmDelete ? 'open' : ''}`} onClick={() => setConfirmDelete(null)}>
        <div className="delete-modal" onClick={e => e.stopPropagation()}>
          <div className="px-6 pt-6 pb-4">
            <h3 className="delete-modal-title">¿Eliminar finca?</h3>
            <p className="delete-modal-text mt-3">Se eliminaran todas las parcelas asociadas a esta finca.</p>
          </div>
          <div className="px-6 pb-6">
            <div className="delete-modal-actions">
              <button onClick={() => setConfirmDelete(null)} className="delete-btn delete-btn-secondary">Cancelar</button>
              <button onClick={() => handleDeleteFarm(confirmDelete)} className="delete-btn delete-btn-danger">Eliminar</button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
