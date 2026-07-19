import './ChatbotPage.css'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import ProfileModal from '../../components/ProfileModal'
import SettingsModal from '../../components/SettingsModal'
import ContextModal from '../../components/modals/ContextModal'
import ParcelasModal from '../../components/modals/ParcelasModal'
import AddFarmModal from '../../components/modals/AddFarmModal'
import AddPlotModal from '../../components/modals/AddPlotModal'
import ConfirmDeleteModal from '../../components/modals/ConfirmDeleteModal'
import { getFarms, createFarm, updateFarm, deleteFarm, createPlot, updatePlot, deletePlot, getConversations, getConversation, createConversation, deleteConversation, sendMessage, createContext, updateContext, updateConversation, getPlantHistories, createPlantHistory, askChatbot, askChatbotStream, getSuggestions } from '../../services/chatbotService'
import { uploadImage, updateAnalysis, getWeather } from '../../services/analysisService'
import { API_PAGE_SIZE } from '../../services/apiConfig'
import ConversationPDF from '../../components/pdf/ConversationPDF'
import WelcomeScreen from './components/WelcomeScreen'
import SuggestedQuestions from './components/SuggestedQuestions'
import AnalysisCard from './components/AnalysisCard'
import Sidebar from '../../components/Sidebar'
import { UserBubble, AssistantBubble, LoadingDots } from './components/MessageBubble'

export default function ChatbotPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [messages, setMessages] = useState([])
  const [showWelcome, setShowWelcome] = useState(true)
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [sending, setSending] = useState(false)
  const [suggestedQuestions, setSuggestedQuestions] = useState([])
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
  const [editingFarm, setEditingFarm] = useState(null)
  const [editingPlot, setEditingPlot] = useState(null)
  const [showContextModal, setShowContextModal] = useState(false)
  const [pdfConversationData, setPdfConversationData] = useState(null)
  const [renamingConvId, setRenamingConvId] = useState(null)
  const [renameValue, setRenameValue] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [confirmDeleteConv, setConfirmDeleteConv] = useState(null)
  const [contextSelectedFarmId, setContextSelectedFarmId] = useState('')
  const [contextSelectedZone, setContextSelectedZone] = useState('')
  const [contextSelectedPlotId, setContextSelectedPlotId] = useState('')
  const [farmName, setFarmName] = useState('')
  const [farmLocation, setFarmLocation] = useState('')
  const [plotName, setPlotName] = useState('')
  const [plotGps, setPlotGps] = useState('')
  const [plotHectares, setPlotHectares] = useState('')
  const [plotZone, setPlotZone] = useState('')
  const [plotRows, setPlotRows] = useState('')
  const [sessionMenuState, setSessionMenuState] = useState({ sessionId: null, left: 0, top: 0, open: false })
  const [contextOptions, setContextOptions] = useState({ lotId: [], zone: [], rows: [] })
  const [showNoFarmHint, setShowNoFarmHint] = useState(false)
  const [showNoContextHint, setShowNoContextHint] = useState(false)
  const [weatherData, setWeatherData] = useState(null)
  const [weatherLoading, setWeatherLoading] = useState(false)
  const [weatherCondition, setWeatherCondition] = useState('')
  const [plotGpsCoords, setPlotGpsCoords] = useState({ lat: '', lng: '' })
  const [farmError, setFarmError] = useState('')
  const [plotError, setPlotError] = useState('')
  const [streamDoneIds, setStreamDoneIds] = useState(new Set())
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
  const settingsLotInputRef = useRef(null)
  const settingsZoneInputRef = useRef(null)
  const settingsRowsInputRef = useRef(null)
  const parcelasModalRef = useRef(null)
  const addFarmModalRef = useRef(null)
  const addPlotModalRef = useRef(null)
  const contextSelModalRef = useRef(null)
  const animatedModalRefs = useRef(new Set())
  const displayName = user?.full_name || user?.username || 'Usuario'
  const userEmail = user?.email || ''
  const roleLabel = user?.role_label || (user?.is_admin ? 'Administrador' : 'Usuario')
  const initials = (() => {
    const parts = displayName.split(' ')
    return parts.length > 1 ? (parts[0][0] + parts[1][0]).toUpperCase() : displayName.substring(0, 2).toUpperCase()
  })()
  const profilePhotoUrl = user?.profile_photo_url

  const farmsCacheRef = useRef(null)
  const conversationsCacheRef = useRef(null)
  const plantHistoriesCacheRef = useRef(null)
  const pendingFarmsRef = useRef(null)
  const pendingConversationsRef = useRef(null)
  const debounceRef = useRef(null)

  const invalidateFarmsCache = () => { farmsCacheRef.current = null }
  const invalidateConversationsCache = () => { conversationsCacheRef.current = null }

  const loadFarms = async (force = false) => {
    if (!force && farmsCacheRef.current) { setFarms(farmsCacheRef.current); return }
    if (pendingFarmsRef.current) return pendingFarmsRef.current
    const p = (async () => {
      try { const d = await getFarms({ page_size: API_PAGE_SIZE }); farmsCacheRef.current = Array.isArray(d) ? d : d.results || []; setFarms(farmsCacheRef.current) } catch { setFarms([]) }
    })()
    pendingFarmsRef.current = p
    await p
    pendingFarmsRef.current = null
  }

  const loadConversations = async (force = false) => {
    if (!force && conversationsCacheRef.current) { setConversations(conversationsCacheRef.current); return }
    if (pendingConversationsRef.current) return pendingConversationsRef.current
    const p = (async () => {
      try { const d = await getConversations({ page_size: API_PAGE_SIZE }); conversationsCacheRef.current = Array.isArray(d) ? d : d.results || []; setConversations(conversationsCacheRef.current) } catch { setConversations([]) }
    })()
    pendingConversationsRef.current = p
    await p
    pendingConversationsRef.current = null
  }

  const debouncedLoadFarms = useCallback(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => { invalidateFarmsCache(); loadFarms(true) }, 2000)
  }, [])

  const debouncedLoadConversations = useCallback(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => { invalidateConversationsCache(); loadConversations(true) }, 2000)
  }, [])

  const loadPlantHistories = async (force = false) => {
    if (!force && plantHistoriesCacheRef.current) return plantHistoriesCacheRef.current
    try {
      const phs = await getPlantHistories({ page_size: API_PAGE_SIZE })
      plantHistoriesCacheRef.current = Array.isArray(phs) ? phs : phs.results || []
      return plantHistoriesCacheRef.current
    } catch { return [] }
  }

  useEffect(() => {
    loadFarms()
    const t1 = setTimeout(() => loadConversations(), 300)
    const t2 = setTimeout(() => loadPlantHistories(), 600)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  const location = useLocation()
  const [searchParams] = useSearchParams()
  const urlConvId = searchParams.get('conversation')
  const stateConvId = location.state?.conversationId
  const targetConvId = stateConvId || urlConvId

  useEffect(() => {
    if (!targetConvId) return
    async function loadConversation() {
      try {
        const full = await getConversation(targetConvId)
        if (full && full.id) {
          setActiveConvId(full.id)
          setMessages((full.messages || []).slice().sort((a, b) => (a.id ?? 0) - (b.id ?? 0)))
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
    if (chatAreaRef.current) chatAreaRef.current.scrollTop = chatAreaRef.current.scrollHeight
  }, [messages])

  useEffect(() => {
    if (!contextSelectedPlotId || !farms.length) { setWeatherData(null); setWeatherCondition(''); return }
    const plot = farms.flatMap(f => f.plots || []).find(p => String(p.id) === String(contextSelectedPlotId))
    if (!plot?.gps_location) { setWeatherData(null); return }
    const nums = plot.gps_location.match(/-?\d+\.?\d+/g)
    if (!nums || nums.length < 2) { setWeatherData(null); return }
    const lat = parseFloat(nums[0]), lon = parseFloat(nums[1])
    let cancelled = false
    setWeatherLoading(true)
    setWeatherData(null)
    ;(async () => {
      try {
        const data = await getWeather(lat, lon)
        if (!cancelled) { setWeatherData(data); setWeatherCondition(data.condition) }
      } catch { if (!cancelled) setWeatherData(null) }
      if (!cancelled) setWeatherLoading(false)
    })()
    return () => { cancelled = true }
  }, [contextSelectedPlotId, farms])

  // Leaflet map lifecycle is now handled inside AddPlotModal

  const getSelectedPlotContext = () => {
    const plotVal = contextSelectedPlotId || contextRowsRef.current?.value || ''
    const selectedFarm = farms.find(farm => String(farm.id) === String(contextLotRef.current?.value || contextSelectedFarmId)) || null
    const selectedPlot = farms
      .flatMap(farm => (farm.plots || []).map(plot => ({ ...plot, farmId: farm.id, farmName: farm.name })))
      .find(plot => String(plot.id) === String(plotVal)) || null
    return { selectedFarm, selectedPlot }
  }

  const buildPlantHistoryEntry = ({ analysisResult, convId, userText, botReply, comparisonText, fullMessages, imageUrl, imageType }) => {
    const { selectedFarm, selectedPlot } = getSelectedPlotContext()
    const plantKeyOrId = contextPlantRef.current?.value || ''
    const plotId = selectedPlot?.id || contextSelectedPlotId || ''
    const plantKey = `${plantKeyOrId || `plot_${plotId}`}${plotId ? `|${plotId}` : ''}`.replace(/\|$/, '')
    const contextDetail = {
      datetime: contextDatetimeRef.current?.value || '',
      farm_id: selectedFarm?.id || contextSelectedFarmId || '',
      farm_name: selectedFarm?.name || '',
      lotId: selectedFarm?.name || '',
      plot_id: plotId,
      plot_name: selectedPlot?.name || '',
      zone: contextZoneRef.current?.value || contextSelectedZone || selectedPlot?.zone || '',
      rows: selectedPlot?.rows || '',
      plant_key_or_id: plantKeyOrId,
      location: contextLocationRef.current?.value || selectedPlot?.gps_location || '',
      main_symptom: contextSymptomRef.current?.value || '',
      affected_part: contextPartRef.current?.value || '',
      stage: contextStageRef.current?.value || '',
      severity: contextSeverityRef.current?.value || '',
      irrigation: contextIrrigationRef.current?.value || '',
      phytosanitary: contextPhytoRef.current?.value || '',
      weather: weatherCondition || '',
      notes: contextNotesRef.current?.value || '',
    }

    return {
      id: analysisResult.id,
      analysis_result: analysisResult.id,
      conversation: convId,
      conversation_id: convId,
      sessionId: convId,
      created_at: analysisResult.created_at || new Date().toISOString(),
      date: Date.now(),
      plant_key: plantKey,
      plantKey,
      lotId: contextDetail.lotId,
      zone: contextDetail.zone,
      rows: contextDetail.rows,
      plantId: contextDetail.plant_key_or_id,
      disease_name_predicted: analysisResult.disease_name_predicted || '',
      final_diagnosis: analysisResult.final_diagnosis || '',
      severity: analysisResult.severity || '',
      confidence_percent: analysisResult.confidence_percent ?? '',
      analysis_text: analysisResult.analysis_text || '',
      recommendations_text: analysisResult.recommendations_text || '',
      image_url: imageUrl || analysisResult.image_url || imagePreview || '',
      image_type: imageType || '',
      user_message: userText,
      assistant_reply: botReply,
      comparison_reply: comparisonText || '',
      context_detail: contextDetail,
      messages: Array.isArray(fullMessages) ? fullMessages : [],
    }
  }

  const sevOrder = { ninguna:0, baja:1, leve:1, moderada:2, alta:3, critica:4, crítica:4 }

  function generateComparison(prevHistories, current) {
    if (!prevHistories.length) return ''
    const prev = prevHistories[0]
    const prevDate = prev.created_at ? new Date(prev.created_at) : null
    const dateStr = prevDate ? prevDate.toLocaleDateString('es-EC', { day:'numeric', month:'long', year:'numeric' }) : 'fecha desconocida'
    const prevDisease = prev.disease_name_predicted || prev.final_diagnosis || '—'
    const curDisease = current.disease_name_predicted || '—'
    const prevSev = (prev.severity || '').toLowerCase()
    const curSev = (current.severity || '').toLowerCase()
    const prevLevel = sevOrder[prevSev] !== undefined ? sevOrder[prevSev] : -1
    const curLevel = sevOrder[curSev] !== undefined ? sevOrder[curSev] : -1
    let trend = ''
    if (prevLevel >= 0 && curLevel >= 0) {
      if (curLevel < prevLevel) trend = 'Mejorando'
      else if (curLevel > prevLevel) trend = 'Empeorando'
      else trend = 'Estable'
    }
    const sameDiseaseCount = prevHistories.filter(e =>
      (e.disease_name_predicted || e.final_diagnosis || '').toLowerCase() === curDisease.toLowerCase()
    ).length
    const isRecurring = sameDiseaseCount >= 2
    const prevDiseaseChanged = prevDisease.toLowerCase() !== curDisease.toLowerCase()
    let advice = ''
    if (trend === 'Mejorando') {
      advice = 'Las acciones de manejo están dando resultado. Continúa con el seguimiento.'
      if (prevDiseaseChanged) advice += ' La enfermedad detectada es diferente a la anterior, lo que sugiere que el tratamiento anterior fue efectivo contra el patógeno previo.'
    } else if (trend === 'Empeorando') {
      advice = 'Se necesita reforzar las medidas de control. Revisa el plan fitosanitario.'
      if (isRecurring) advice += ' Esta enfermedad se ha presentado en múltiples ocasiones. Considera rotar el principio activo del fungicida y evaluar condiciones ambientales que favorecen su aparición.'
      if (curLevel >= 3) advice += ' La severidad es alta. Se recomienda una intervención inmediata y consultar con un ingeniero agrónomo.'
    } else {
      advice = 'No se detectan cambios significativos. Mantén el monitoreo constante.'
      if (isRecurring) advice += ' Aunque la severidad no ha cambiado, la enfermedad persiste. Evalúa si el manejo actual está siendo efectivo a largo plazo.'
    }
    if (prevHistories.length >= 3) {
      const levels = prevHistories.map(e => sevOrder[(e.severity || '').toLowerCase()] ?? -1).filter(l => l >= 0)
      if (levels.length >= 3) {
        const first = levels[levels.length - 1]
        const last = levels[0]
        if (last > first) advice += ' En perspectiva general, la condición ha empeorado desde el primer registro. Revisa la estrategia de manejo integral.'
        else if (last < first) advice += ' En perspectiva general, la condición ha mejorado desde el primer registro. Sigue con el plan actual.'
      }
    }
    return (
      '**Comparación con análisis anterior**\n\n' +
      `**Análisis anterior:** ${dateStr}\n\n` +
      `**Antes:** ${prevDisease} · Severidad: ${prev.severity || '—'}\n` +
      `**Ahora:** ${curDisease} · Severidad: ${current.severity || '—'}\n\n` +
      `**Tendencia:** ${trend}\n` +
      `**Recomendación:** ${advice}`
    )
  }

  const handleSaveContext = async () => {
    try {
      const plotVal = contextSelectedPlotId || contextRowsRef.current?.value || ''
      const allPlots = farms.flatMap(f => f.plots || [])
      const selectedPlot = allPlots.find(p => String(p.id) === String(plotVal))
      if (!selectedPlot) {
        alert('Selecciona una parcela antes de guardar.')
        return
      }
      const contextData = {
        plot: selectedPlot.id,
        plant_key_or_id: contextPlantRef.current?.value || '',
        main_symptom: contextSymptomRef.current?.value || '',
        affected_part: contextPartRef.current?.value || '',
        status: contextSeverityRef.current?.value?.toLowerCase() || 'desconocida',
      }
      let convId = activeConvId
      let contextId = null
      if (convId) {
        const conv = await getConversation(convId)
        if (conv.context) {
          const existingCtxId = typeof conv.context === 'object' ? conv.context.id : conv.context
          await updateContext(existingCtxId, contextData)
          contextId = existingCtxId
        } else {
          const newCtx = await createContext(contextData)
          contextId = newCtx.id
          await updateConversation(convId, { context: contextId })
        }
      } else {
        const newCtx = await createContext(contextData)
        contextId = newCtx.id
        const conv = await createConversation({ title: 'Nueva conversacion', context: contextId })
        convId = conv.id
        setActiveConvId(convId)
        debouncedLoadConversations()
      }
      savedContextIdRef.current = contextId
      setShowNoContextHint(false)
      const pkPlant = contextData.plant_key_or_id || `plot_${selectedPlot.id}`
      const pk = `${pkPlant}|${selectedPlot.id}`
      savedPlantKeyRef.current = pk
    } catch (e) {
      console.error('Error al guardar contexto:', e)
      alert('Error al guardar el contexto. Verifica tu conexion e intenta de nuevo.')
    }
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

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage() }
  }

  const handleSendMessage = async () => {
    if (sending) return
    const text = inputValue.trim()
    if (!text && !imageFile) return
    const imgFile = imageFile
    const imgPrev = imagePreview
    const imgType = imageFile?.type || ''
    removeImage()
    setSuggestedQuestions([])
    setMessages(prev => [...prev, { role: 'user', content: text, image_type: imgType, image_path: imgPrev }]); setInputValue(''); setShowWelcome(false); setSending(true)
    let convId = activeConvId
    try {
      if (!convId) {
        const ctxIdForConv = savedContextIdRef.current
        const conv = await createConversation({
          title: text.substring(0, 100) || 'Nueva conversacion',
          ...(ctxIdForConv ? { context: ctxIdForConv } : {}),
        })
        convId = conv.id; setActiveConvId(convId); debouncedLoadConversations()
      }
      let imageUrl = ''
      let analysisResult = null
      if (imgFile) {
        // Coordenadas: leer del campo GPS del formulario de contexto
        let geoCoords = null
        const locationVal = contextLocationRef.current?.value || ''
        const nums = locationVal.match(/-?\d+\.?\d+/g)
        if (nums && nums.length >= 2) {
          const lat = parseFloat(nums[0])
          const lon = parseFloat(nums[1])
          if (!isNaN(lat) && !isNaN(lon)) geoCoords = { lat, lon }
        }
        // Si el campo de contexto no tiene coordenadas, intentar GPS del dispositivo
        if (!geoCoords && navigator.geolocation) {
          geoCoords = await new Promise(resolve => {
            navigator.geolocation.getCurrentPosition(
              ({ coords }) => resolve({ lat: coords.latitude, lon: coords.longitude }),
              () => resolve(null),
              { timeout: 10000, maximumAge: 0, enableHighAccuracy: true }
            )
          })
        }
        const formData = new FormData()
        formData.append('image_path', imgFile)
        formData.append('conversation', convId)
        if (geoCoords) {
          formData.append('latitude',  geoCoords.lat)
          formData.append('longitude', geoCoords.lon)
        }
        analysisResult = await uploadImage(formData)
        imageUrl = analysisResult.image_url || ''
      }
      // Only send image_type when no prior uploadImage result — prevents backend from creating a second analysis record
      const userMsg = await sendMessage({
        conversation: convId,
        role: 'user',
        content: text,
        image_path: imageUrl,
        ...(analysisResult ? {} : { image_type: imgType }),
      })
      if (analysisResult && analysisResult.id) {
        updateAnalysis(analysisResult.id, { chat_message: userMsg.id }).catch(() => {})
      }
      if (analysisResult) {
        const disease = analysisResult.disease_name_predicted || 'Pendiente'
        const severity = analysisResult.severity || 'Desconocida'
        const confidence = analysisResult.confidence_percent || '---'
        const recs = analysisResult.recommendations_text || ''

        // Tarjeta de resultados del modelo de visi\u00f3n
        const cardContent = JSON.stringify({ __type: 'analysis_card', disease, severity, confidence, recs })
        setMessages(prev => [...prev, { id: `card-${Date.now()}`, role: 'assistant', type: 'analysis-card', disease, severity, confidence, recs, content: cardContent }])
        await sendMessage({ conversation: convId, role: 'assistant', content: cardContent })

        // Mensaje 1: Comprensi\u00f3n de la enfermedad e impacto
        const weatherCtx = weatherData
          ? `Condiciones clim\u00e1ticas actuales en la parcela: ${weatherData.condition || weatherCondition}${weatherData.temperature !== undefined ? `, ${weatherData.temperature}\u00b0C` : ''}${weatherData.humidity !== undefined ? `, humedad relativa ${weatherData.humidity}%` : ''}.`
          : weatherCondition
          ? `Condici\u00f3n clim\u00e1tica en la parcela: ${weatherCondition}.`
          : ''

        const diseasePrompt = [
          `Pitahaya Vision detect\u00f3: ${disease} \u2014 severidad ${severity} \u2014 confianza ${confidence}%.\n`,
          recs ? `Observaci\u00f3n del modelo: ${recs}\n` : '',
          weatherCtx ? `${weatherCtx}\n` : '',
          text ? `El agricultor pregunta: "${text}"\n` : '',
          `\nComo fitopat\u00f3logo de pitahaya, explica en m\u00e1ximo 4 oraciones: qu\u00e9 es esta enfermedad, `,
          `sus causas principales${weatherCtx ? ' considerando las condiciones clim\u00e1ticas indicadas' : ''} y el impacto agron\u00f3mico concreto para severidad ${severity}. `,
          `Sin tratamiento, solo diagn\u00f3stico e impacto.`,
        ].join('')

        const _sid1 = `stream-d-${Date.now()}`
        setMessages(prev => [...prev, { id: _sid1, role: 'assistant', content: '' }])
        let botReply = ''
        try {
          botReply = await askChatbotStream({
            message: diseasePrompt, conversation_id: convId, max_length: 180,
            onToken: (full) => setMessages(prev => prev.map(m => m.id === _sid1 ? { ...m, content: `**Resultados del análisis**\n\n${full}` } : m)),
          })
        } catch {}
        setStreamDoneIds(prev => new Set([...prev, _sid1]))
        if (!botReply) {
          botReply = `**Diagn\u00f3stico:** ${disease}\n**Severidad:** ${severity}\n**Confianza:** ${confidence}%\n\n${recs || 'Consulta con un ingeniero agr\u00f3nomo.'}`
        }
        await sendMessage({ conversation: convId, role: 'assistant', content: `**Resultados del an\u00e1lisis**\n\n${botReply}` })

        // Mensaje 2: Plan de tratamiento
        const treatmentPrompt = [
          `Pitahaya con "${disease}", severidad "${severity}".\n`,
          weatherCtx ? `${weatherCtx}\n` : '',
          `Como especialista fitosanitario, indica en forma de lista numerada (m\u00e1ximo 5 pasos) `,
          `el plan de tratamiento inmediato y las medidas preventivas clave`,
          weatherCtx ? `, adaptadas a las condiciones clim\u00e1ticas indicadas (por ejemplo: si hay lluvia, evitar aplicaciones foliares; si hay alta humedad, priorizar fungicidas preventivos; si hay sequ\u00eda, reforzar riego).` : '.',
          ` S\u00e9 directo y espec\u00edfico.`,
        ].join('')

        const _sid2 = `stream-t-${Date.now()}`
        setMessages(prev => [...prev, { id: _sid2, role: 'assistant', content: '' }])
        let treatmentReply = ''
        try {
          treatmentReply = await askChatbotStream({
            message: treatmentPrompt, conversation_id: convId, max_length: 280,
            onToken: (full) => setMessages(prev => prev.map(m => m.id === _sid2 ? { ...m, content: `**Plan de tratamiento**\n\n${full}` } : m)),
          })
        } catch {}
        setStreamDoneIds(prev => new Set([...prev, _sid2]))
        if (!treatmentReply) {
          treatmentReply = 'Consulte con un ingeniero agr\u00f3nomo para un plan de tratamiento espec\u00edfico seg\u00fan las condiciones locales del cultivo.'
        }
        await sendMessage({ conversation: convId, role: 'assistant', content: `**Plan de tratamiento**\n\n${treatmentReply}` })

        // Fetch plant histories once — used for both deduplication check and comparison
        let allPhs = []
        try {
          const phs = await loadPlantHistories()
          allPhs = Array.isArray(phs) ? phs : phs.results || []
        } catch {}

        // Save plant history only if backend didn't auto-create one for this analysis
        const ctxId = savedContextIdRef.current
        if (ctxId) {
          const alreadyExists = allPhs.some(ph => {
            const phId = ph.analysis_result?.id ?? ph.analysis_result
            return String(phId) === String(analysisResult.id)
          })
          if (!alreadyExists) {
            try {
              const newPh = await createPlantHistory({
                context: ctxId,
                analysis_result: analysisResult.id,
                final_diagnosis: analysisResult.disease_name_predicted || '',
                notes: contextNotesRef.current?.value || '',
              })
              allPhs = [...allPhs, newPh]
            } catch (e) {
              console.error('Error guardando historial de planta:', e)
            }
          }
        }

        // Compare with prior analyses of the same plant using already-fetched list
        let comparisonText = ''
        const currentPlotId = contextSelectedPlotId || (contextRowsRef.current?.value || '')
        const currentPlantKey = savedPlantKeyRef.current
        if ((currentPlotId || currentPlantKey) && allPhs.length > 0) {
          const matching = allPhs.filter(ph => {
            const phAnalysisId = ph.analysis_result?.id ?? ph.analysis_result
            if (String(phAnalysisId) === String(analysisResult.id)) return false
            const phPlantKey = ph.plant_key || ph.plantKey
            if (phPlantKey && currentPlantKey) return phPlantKey === currentPlantKey
            const phPlotId = ph.context?.plot || ph.context?.plot_id || ''
            return currentPlotId && String(phPlotId) === String(currentPlotId)
          })
          if (matching.length > 0) {
            const normalized = matching.map(ph => ({
              disease_name_predicted: ph.final_diagnosis || ph.analysis_result?.disease_name_predicted || '',
              severity: ph.analysis_result?.severity || ph.severity || '',
              confidence_percent: ph.analysis_result?.confidence_percent || '',
              created_at: ph.created_at || ph.analysis_result?.created_at || '',
            }))
            // Ordenar por fecha descendente para tomar el an\u00e1lisis previo m\u00e1s reciente
            const sortedPrev = [...normalized].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            const prev = sortedPrev[0]
            const fmt = (d) => d ? new Date(d).toLocaleDateString('es-EC', { day: '2-digit', month: 'long', year: 'numeric' }) : 'Fecha no registrada'
            const prevDate = fmt(prev.created_at)
            const currentDate = fmt(new Date().toISOString())

            // Encabezado estructurado con los datos clave de ambos an\u00e1lisis
            const compHeader = [
              `**Comparaci\u00f3n con an\u00e1lisis anterior**\n\n`,
              `**An\u00e1lisis anterior** \u2014 ${prevDate}\n`,
              `- Enfermedad detectada: ${prev.disease_name_predicted || 'No registrada'}\n`,
              `- Severidad: ${prev.severity || 'No registrada'}\n`,
              prev.confidence_percent ? `- Confianza del modelo: ${prev.confidence_percent}%\n` : '',
              `\n**Diagn\u00f3stico actual** \u2014 ${currentDate}\n`,
              `- Enfermedad detectada: ${disease}\n`,
              `- Severidad: ${severity}\n`,
              `- Confianza del modelo: ${confidence}%\n`,
              `\n`,
            ].join('')

            const rawComp = generateComparison(normalized, analysisResult)
            const compPrompt = (
              `Cultivo de pitahaya:\n` +
              `- An\u00e1lisis anterior (${prevDate}): "${prev.disease_name_predicted || 'sin datos'}", severidad "${prev.severity || 'sin datos'}"\n` +
              `- Diagn\u00f3stico actual (${currentDate}): "${disease}", severidad "${severity}"\n\n` +
              `En m\u00e1ximo 3 oraciones: \u00bfla condici\u00f3n mejor\u00f3, empeor\u00f3 o se mantuvo? \u00bfQu\u00e9 acci\u00f3n prioritaria debe tomar el agricultor?`
            )
            try {
              const compResult = await askChatbot({ message: compPrompt, conversation_id: convId, no_rag: true, max_length: 160 })
              comparisonText = compHeader + (compResult.response || rawComp || '')
            } catch {
              comparisonText = compHeader + (rawComp || '')
            }
          }
        }
        if (comparisonText) {
          await sendMessage({ conversation: convId, role: 'assistant', content: comparisonText })
        }
        const suggestionContext = [
          `Diagnóstico del modelo de visión: ${disease} — severidad ${severity} — confianza ${confidence}%.`,
          recs ? `Recomendación del modelo: ${recs}` : '',
          botReply ? `Resultados del análisis (Gemma): ${botReply}` : '',
          treatmentReply ? `Plan de tratamiento (Gemma): ${treatmentReply}` : '',
          comparisonText ? `Comparación con análisis anterior: ${comparisonText}` : '',
        ].filter(Boolean).join('\n\n')
        generateSuggestions(suggestionContext)
      } else {
        const _sid = `stream-${Date.now()}`
        setMessages(prev => [...prev, { id: _sid, role: 'assistant', content: '' }])
        let botReply = ''
        try {
          botReply = await askChatbotStream({
            message: text, conversation_id: convId, max_length: 250,
            onToken: (full) => setMessages(prev => prev.map(m => m.id === _sid ? { ...m, content: full } : m)),
          })
          if (!botReply) botReply = 'No pude generar una respuesta. Intenta de nuevo.'
        } catch {
          botReply = 'Ocurri\u00f3 un error al consultar el asistente. Intenta de nuevo.'
          setMessages(prev => prev.map(m => m.id === _sid ? { ...m, content: botReply } : m))
        }
        setStreamDoneIds(prev => new Set([...prev, _sid]))
        await sendMessage({ conversation: convId, role: 'assistant', content: botReply })
        generateSuggestions(botReply)
      }
      try {
        const full = await getConversation(convId)
        const msgs = (full.messages || []).slice().sort((a, b) => (a.id ?? 0) - (b.id ?? 0))
        setMessages(msgs)
      } catch {}
      debouncedLoadConversations()
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Ocurri\u00f3 un error al procesar tu mensaje. Intenta de nuevo.' }])
    }
    setSending(false)
  }

  const openParcelasModal = () => { setShowParcelasModal(true); closeSidebar() }
  const closeParcelasModal = () => { setShowParcelasModal(false) }

  useEffect(() => {
    if (window.innerWidth >= 640) return
    const setups = [
      { ref: parcelasModalRef, open: showParcelasModal, close: () => setShowParcelasModal(false) },
      { ref: addFarmModalRef, open: showAddFarmModal, close: () => setShowAddFarmModal(false) },
      { ref: addPlotModalRef, open: showAddPlotModal, close: () => setShowAddPlotModal(false) },
      { ref: contextSelModalRef, open: showContextModal, close: () => setShowContextModal(false) },
    ]
    const cleanups = []
    setups.forEach(({ ref, open, close }) => {
      if (!open || !ref.current) return
      const modal = ref.current
      const handle = modal.querySelector('.drag-handle')
      if (!handle) return

      // Animación de entrada JS (slide-up) — solo la primera vez que abre
      if (!animatedModalRefs.current.has(ref)) {
        animatedModalRefs.current.add(ref)
        modal.style.transition = 'none'
        modal.style.transform = 'translateY(100%)'
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            modal.style.transition = 'transform 0.38s cubic-bezier(0.32,0.72,0,1)'
            modal.style.transform = 'translateY(0)'
          })
        })
      }

      let sy = 0, dy = 0
      const onStart = e => {
        sy = e.touches[0].clientY; dy = 0
        modal.style.transition = 'none'
      }
      const onMove = e => {
        dy = Math.max(0, e.touches[0].clientY - sy)
        modal.style.transform = `translateY(${dy}px)`
      }
      const onEnd = () => {
        if (dy > 80) {
          modal.style.transition = 'transform 0.32s cubic-bezier(0.32,0.72,0,1)'
          modal.style.transform = 'translateY(110%)'
          setTimeout(() => { modal.style.transform = ''; modal.style.transition = ''; animatedModalRefs.current.delete(ref); close() }, 340)
        } else {
          modal.style.transition = 'transform 0.3s cubic-bezier(0.32,0.72,0,1)'
          modal.style.transform = 'translateY(0)'
          setTimeout(() => { modal.style.transition = '' }, 320)
        }
      }
      handle.addEventListener('touchstart', onStart, { passive: true })
      handle.addEventListener('touchmove', onMove, { passive: true })
      handle.addEventListener('touchend', onEnd, { passive: true })
      cleanups.push(() => {
        handle.removeEventListener('touchstart', onStart)
        handle.removeEventListener('touchmove', onMove)
        handle.removeEventListener('touchend', onEnd)
      })
    })
    return () => cleanups.forEach(fn => fn())
  }, [showParcelasModal, showAddFarmModal, showAddPlotModal, showContextModal])
  const openSidebar = () => { setSidebarOpen(true); document.body.style.overflow = 'hidden' }
  const closeSidebar = () => { setSidebarOpen(false); document.body.style.overflow = '' }
  const handleLogout = async () => { await logout(); navigate('/login', { replace: true }) }

  const newChat = () => {
    setMessages([]); setInputValue(''); removeImage()
    setSuggestedQuestions([]); setShowNoContextHint(false)
    setShowWelcome(true); setActiveConvId(null)
    savedContextIdRef.current = null; savedPlantKeyRef.current = ''
    setContextSelectedFarmId(''); setContextSelectedZone(''); setContextSelectedPlotId('')
    closeSidebar(); setSending(false)
    if (farms.length === 0) {
      setShowParcelasModal(true)
    } else {
      setShowContextModal(true)
    }
  }

  const generateSuggestions = useCallback(async (botResponse) => {
    if (!botResponse || botResponse.length < 30) return
    try {
      const data = await getSuggestions({ bot_response: botResponse })
      const qs = (data.suggestions || []).slice(0, 3)
      if (qs.length > 0) setSuggestedQuestions(qs)
    } catch { /* sugerencias opcionales */ }
  }, [])

  const handleSuggestionClick = (question) => {
    setSuggestedQuestions([])
    suggest(question)
  }

  const suggest = (text) => {
    setSuggestedQuestions([])
    setMessages(prev => [...prev, { role: 'user', content: text }])
    setInputValue(''); setShowWelcome(false); setSending(true)
    setTimeout(async () => {
      try {
        let convId = activeConvId
        if (!convId) {
          const conv = await createConversation({ title: text.substring(0, 100) })
          convId = conv.id; setActiveConvId(convId); debouncedLoadConversations()
        }
        await sendMessage({ conversation: convId, role: 'user', content: text })
        const _sid = `stream-${Date.now()}`
        setMessages(prev => [...prev, { id: _sid, role: 'assistant', content: '' }])
        let botReply = ''
        try {
          botReply = await askChatbotStream({
            message: text, conversation_id: convId, max_length: 250,
            onToken: (full) => setMessages(prev => prev.map(m => m.id === _sid ? { ...m, content: full } : m)),
          })
          if (!botReply) botReply = 'No pude generar una respuesta. Intenta de nuevo.'
        } catch {
          botReply = 'Ocurri\u00f3 un error al consultar el asistente. Intenta de nuevo.'
          setMessages(prev => prev.map(m => m.id === _sid ? { ...m, content: botReply } : m))
        }
        setStreamDoneIds(prev => new Set([...prev, _sid]))
        await sendMessage({ conversation: convId, role: 'assistant', content: botReply })
        try {
          const full = await getConversation(convId)
          setMessages((full.messages || []).slice().sort((a, b) => (a.id ?? 0) - (b.id ?? 0)))
        } catch {}
        debouncedLoadConversations()
        generateSuggestions(botReply)
      } catch {}
      setInputValue('')
      setSending(false)
    }, 800)
  }

  const selectConversation = async (conv) => {
    setActiveConvId(conv.id)
    setSuggestedQuestions([])
    try {
      const full = await getConversation(conv.id)
      setMessages((full.messages || []).slice().sort((a, b) => (a.id ?? 0) - (b.id ?? 0)))
    } catch {
      setMessages((conv.messages || []).slice().sort((a, b) => (a.id ?? 0) - (b.id ?? 0)))
    }
    setShowWelcome(false)
    if (window.innerWidth < 768) closeSidebar()
  }

  const handleSelectPlot = (plot, farm) => {
    setContextSelectedFarmId(farm.id); setContextSelectedZone(plot.zone || '')
    setContextSelectedPlotId(String(plot.id))
    setTimeout(() => { if (contextRowsRef.current) contextRowsRef.current.value = String(plot.id) }, 0)
    if (contextLocationRef.current && plot.gps_location) contextLocationRef.current.value = plot.gps_location
    if (contextDatetimeRef.current && !contextDatetimeRef.current.value) {
      contextDatetimeRef.current.value = new Date().toISOString().slice(0, 16)
    }
    setShowParcelasModal(false); setShowContextModal(true)
  }

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

  const handleDeleteConversation = async () => {
    if (!confirmDeleteConv) return
    try {
      await deleteConversation(confirmDeleteConv)
      if (activeConvId === confirmDeleteConv) newChat()
      setConfirmDeleteConv(null); closeSessionMenu(); debouncedLoadConversations()
    } catch { alert('Error al eliminar la conversacion') }
  }

  const sortedConversations = (() => {
    const sorted = [...conversations].sort((a, b) => {
      const aPinned = a.pinnedAt || 0, bPinned = b.pinnedAt || 0
      if (aPinned !== bPinned) return bPinned - aPinned
      return (b.updated_at || 0) - (a.updated_at || 0)
    })
    return sorted
  })()
  const openAddFarmModal = () => { setEditingFarm(null); setFarmName(''); setFarmLocation(''); setFarmError(''); setShowAddFarmModal(true) }

  const openEditFarmModal = (farm) => { setEditingFarm(farm); setFarmName(farm.name); setFarmLocation(farm.location || ''); setFarmError(''); setShowAddFarmModal(true) }

  const handleCreateFarm = async () => {
    if (!farmName.trim()) { setFarmError('El nombre de la corporación agrícola es obligatorio.'); return }
    setFarmError('')
    try {
      if (editingFarm) {
        await updateFarm(editingFarm.id, { name: farmName.trim(), location: farmLocation.trim() })
        setShowAddFarmModal(false)
        setEditingFarm(null)
        debouncedLoadFarms()
      } else {
        const newFarm = await createFarm({ name: farmName.trim(), location: farmLocation.trim() })
        setFarmName(''); setFarmLocation('')
        setShowAddFarmModal(false)
        debouncedLoadFarms()
        openAddPlotModal(newFarm)
      }
    } catch { setFarmError('No se pudo guardar la corporación agrícola. Verifica tu conexión e inténtalo de nuevo.') }
  }

  const handleDeleteFarm = async (id) => {
    if (confirmDelete === id) { try {       await deleteFarm(id); setConfirmDelete(null); debouncedLoadFarms() } catch { alert('Error al eliminar la corporación agrícola') } }
    else { setConfirmDelete(id) }
  }

  const openDeleteConvModal = (convId) => {
    setConfirmDeleteConv(convId); closeSessionMenu()
  }

  const shareConversation = async (convId) => {
    closeSessionMenu()
    try {
      const full = await getConversation(convId)
      const msgs = (full.messages || []).slice().sort((a, b) => (a.id ?? 0) - (b.id ?? 0))
      const strip = (c, header) => c?.startsWith(`**${header}**`) ? c.replace(`**${header}**`, '').replace(/^\n+/, '') : c
      const consumed = new Set()
      const items = []
      msgs.forEach((m, idx) => {
        if (consumed.has(idx)) return
        if (m.content?.startsWith('{"__type":"analysis_card"')) {
          let card = null
          try { card = JSON.parse(m.content) } catch {}
          if (!card) return
          let imageUrl = ''
          for (let j = idx - 1; j >= 0; j--) {
            if (msgs[j].role === 'user') { imageUrl = msgs[j].image_path || ''; consumed.add(j); break }
          }
          let treatmentText = ''
          for (let j = idx + 1; j < msgs.length; j++) {
            if (msgs[j].content?.startsWith('**Resultados del análisis**')) { consumed.add(j); continue }
            if (msgs[j].content?.startsWith('**Plan de tratamiento**')) {
              treatmentText = strip(msgs[j].content, 'Plan de tratamiento')
              consumed.add(j)
              break
            }
            break
          }
          items.push({ type: 'analysis', disease: card.disease, severity: card.severity, confidence: card.confidence, recs: card.recs, imageUrl, treatmentText })
        }
      })
      setPdfConversationData({ title: full.title || 'Nueva conversacion', items })
    } catch {
      alert('No se pudo exportar la conversacion')
    }
  }

  const openRenameConvModal = (convId) => {
    const conv = conversations.find(c => c.id === convId)
    setRenameValue(conv?.title || '')
    setRenamingConvId(convId)
    closeSessionMenu()
  }

  const handleRenameConversation = async () => {
    if (!renamingConvId) return
    const title = renameValue.trim() || 'Nueva conversacion'
    try {
      await updateConversation(renamingConvId, { title })
      setConversations(prev => prev.map(c => c.id === renamingConvId ? { ...c, title } : c))
    } catch { alert('Error al renombrar la conversacion') }
    setRenamingConvId(null)
  }

  const openAddPlotModal = (farm) => {
    setEditingPlot(null)
    setSelectedFarmForPlot(farm)
    setPlotName(''); setPlotGps(''); setPlotHectares(''); setPlotZone(''); setPlotRows('')
    setPlotGpsCoords({ lat: '', lng: '' })
    setPlotError('')
    setShowAddPlotModal(true)
  }

  const openEditPlotModal = (plot, farm) => {
    setEditingPlot(plot)
    setSelectedFarmForPlot(farm)
    setPlotName(plot.name || '')
    setPlotGps(plot.gps_location || '')
    setPlotHectares(plot.hectares != null ? String(plot.hectares) : '')
    setPlotZone(plot.zone || '')
    setPlotRows(plot.rows || '')
    const coords = (plot.gps_location || '').split(',').map(s => s.trim())
    setPlotGpsCoords({ lat: coords[0] || '', lng: coords[1] || '' })
    setPlotError('')
    setShowAddPlotModal(true)
  }

  const handleCreatePlot = async () => {
    if (!plotName.trim()) { setPlotError('El nombre de la parcela es obligatorio.'); return }
    setPlotError('')
    try {
      if (editingPlot) {
        await updatePlot(editingPlot.id, { name: plotName.trim(), gps_location: plotGps.trim(), hectares: parseFloat(plotHectares) || 0, zone: plotZone.trim(), rows: plotRows.trim() })
        setShowAddPlotModal(false)
        setEditingPlot(null)
        debouncedLoadFarms()
      } else {
        if (!selectedFarmForPlot) return
        await createPlot({ farm: selectedFarmForPlot.id, name: plotName.trim(), gps_location: plotGps.trim(), hectares: parseFloat(plotHectares) || 0, zone: plotZone.trim(), rows: plotRows.trim() })
        setShowAddPlotModal(false)
        debouncedLoadFarms()
        if (farms.flatMap(f => f.plots || []).length === 0) {
          setShowParcelasModal(false)
          setShowContextModal(true)
        }
      }
    } catch { setPlotError('No se pudo guardar la parcela. Verifica tu conexión e inténtalo de nuevo.') }
  }

  const handleDeletePlot = async (id) => { try { await deletePlot(id); debouncedLoadFarms() } catch { alert('Error al eliminar la parcela') } }

  const openProfileModal  = () => { setShowProfileModal(true);  setMenuOpen(false) }
  const openSettingsModal = () => { setShowSettingsModal(true); setMenuOpen(false) }

  const addContextOption = (field) => {
    const inputRef = { lotId: settingsLotInputRef, zone: settingsZoneInputRef, rows: settingsRowsInputRef }[field]
    const value = inputRef.current?.value?.trim()
    if (!value) return
    if (!contextOptions[field].includes(value)) setContextOptions(prev => ({ ...prev, [field]: [...prev[field], value] }))
    if (inputRef.current) inputRef.current.value = ''
  }

  const removeContextOption = (field, value) => { setContextOptions(prev => ({ ...prev, [field]: prev[field].filter(v => v !== value) })) }


  const formatBotText = (text) => {
    if (!text) return ''

    // 1. Escapar HTML base
    let escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')

    // Inline: aplica negrita, cursiva y código
    const inline = (t) =>
      t
        .replace(/\*\*(.*?)\*\*/g, '<strong style="font-weight:600">$1</strong>')
        .replace(/\*([^*\n]+?)\*/g, '<em>$1</em>')
        .replace(/`([^`]+)`/g, '<code style="background:#f3f4f6;padding:1px 5px;border-radius:4px;font-size:0.82em;font-family:monospace">$1</code>')

    const lines = escaped.split('\n')
    const out = []
    let inUl = false
    let inOl = false
    let olCounter = 0

    const closeList = () => {
      if (inUl) { out.push('</ul>'); inUl = false }
      if (inOl) { out.push('</ol>'); inOl = false; olCounter = 0 }
    }

    for (const line of lines) {
      const t = line.trim()

      // Títulos
      if (/^### (.+)/.test(t)) {
        closeList()
        out.push(`<p style="font-weight:700;font-size:0.9em;color:#1f2937;margin:10px 0 3px">${inline(t.slice(4))}</p>`)
        continue
      }
      if (/^## (.+)/.test(t)) {
        closeList()
        out.push(`<p style="font-weight:700;font-size:0.95em;color:#111827;margin:12px 0 4px">${inline(t.slice(3))}</p>`)
        continue
      }
      if (/^# (.+)/.test(t)) {
        closeList()
        out.push(`<p style="font-weight:800;font-size:1em;color:#111827;margin:14px 0 5px">${inline(t.slice(2))}</p>`)
        continue
      }

      // Separador
      if (/^---+$/.test(t)) {
        closeList()
        out.push('<hr style="border:none;border-top:1px solid #e5e7eb;margin:10px 0">')
        continue
      }

      // Lista sin orden (- o *)
      if (/^[-*] /.test(line)) {
        if (!inUl) { closeList(); out.push('<ul style="padding-left:1.2rem;margin:4px 0;list-style:disc">'); inUl = true }
        out.push(`<li style="margin:2px 0;color:#374151;line-height:1.55">${inline(line.replace(/^[-*] /, ''))}</li>`)
        continue
      }

      // Lista numerada — renderizamos el número manualmente para evitar el reset de CSS de Tailwind
      if (/^\d+\. /.test(line)) {
        if (!inOl) { closeList(); out.push('<ol style="padding-left:0;margin:4px 0;list-style:none">'); inOl = true; olCounter = 0 }
        olCounter++
        out.push(`<li style="margin:3px 0;color:#374151;line-height:1.55;display:flex;gap:0.45em;align-items:flex-start"><span style="flex-shrink:0;font-weight:600;color:#4b5563;min-width:1.4em">${olCounter}.</span><span>${inline(line.replace(/^\d+\. /, ''))}</span></li>`)
        continue
      }

      // Línea vacía → espacio vertical
      if (t === '') {
        closeList()
        out.push('<div style="height:5px"></div>')
        continue
      }

      // Párrafo normal
      closeList()
      out.push(`<span style="display:block;line-height:1.6;color:#374151">${inline(line)}</span>`)
    }

    closeList()
    return out.join('')
  }

  const handleCopy = (text, index) => {
    navigator.clipboard.writeText(text).then(() => { setCopiedIndex(index); setTimeout(() => setCopiedIndex(null), 2000) })
  }

  const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  const savedContextIdRef = useRef(null)
  const savedPlantKeyRef = useRef('')
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

      {/* SESSION MENU */}
      <div className={`session-menu-overlay ${sessionMenuState.open ? 'open' : ''}`} onClick={closeSessionMenu}></div>
      {sessionMenuState.open && (
        <div className="session-menu" style={{ left: sessionMenuState.left + 'px', top: sessionMenuState.top + 'px' }}>
          <button className="session-menu-item" onClick={() => shareConversation(sessionMenuState.sessionId)}>
            <span className="w-4 h-4 flex items-center justify-center text-gray-500"><i className="fas fa-arrow-up-from-bracket text-[0.72rem]"></i></span>
            <span className="text-sm text-gray-700 font-medium">Compartir conversacion</span>
          </button>
          <button className="session-menu-item" onClick={() => togglePinConversation(sessionMenuState.sessionId)}>
            <span className="w-4 h-4 flex items-center justify-center text-gray-500"><i className="fas fa-thumbtack text-[0.72rem]"></i></span>
            <span className="text-sm text-gray-700 font-medium">{getConvPinState(sessionMenuState.sessionId) ? 'Desfijar' : 'Fijar'} conversacion</span>
          </button>
          <button className="session-menu-item" onClick={() => openRenameConvModal(sessionMenuState.sessionId)}>
            <span className="w-4 h-4 flex items-center justify-center text-gray-500"><i className="fas fa-pen text-[0.72rem]"></i></span>
            <span className="text-sm text-gray-700 font-medium">Cambiar nombre</span>
          </button>
          <button className="session-menu-item" onClick={() => openDeleteConvModal(sessionMenuState.sessionId)}>
            <span className="w-4 h-4 flex items-center justify-center text-gray-500"><i className="fas fa-trash text-[0.72rem]"></i></span>
            <span className="text-sm text-gray-700 font-medium">Eliminar conversacion</span>
          </button>
        </div>
      )}

      {/* RENAME CONVERSATION MODAL */}
      <div className={`delete-overlay ${renamingConvId ? 'open' : ''}`} onClick={() => setRenamingConvId(null)}>
        <div className="delete-modal" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
          <div className="px-6 pt-6 pb-4">
            <h3 className="delete-modal-title">Cambiar nombre</h3>
            <input
              type="text"
              value={renameValue}
              onChange={e => setRenameValue(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleRenameConversation() }}
              autoFocus
              maxLength={100}
              className="mt-3 w-full px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-800 focus:outline-none focus:border-brand-400"
              placeholder="Nombre de la conversacion"
            />
          </div>
          <div className="px-6 pb-6">
            <div className="delete-modal-actions">
              <button className="delete-btn delete-btn-secondary" onClick={() => setRenamingConvId(null)}>Cancelar</button>
              <button className="delete-btn delete-btn-danger delete-btn-green" onClick={handleRenameConversation}>Guardar</button>
            </div>
          </div>
        </div>
      </div>

      {/* CONVERSATION PDF EXPORT */}
      <ConversationPDF isOpen={!!pdfConversationData} onClose={() => setPdfConversationData(null)} data={pdfConversationData} />

      <ConfirmDeleteModal
        isOpen={!!confirmDeleteConv}
        onClose={() => setConfirmDeleteConv(null)}
        title="¿Eliminar conversacion?"
        message="Se eliminaran las peticiones, las respuestas y los comentarios de tu ajuste, ademas de cualquier contenido que hayas creado."
        onConfirm={handleDeleteConversation}
      />

      {/* LAYOUT */}
      <div id="appLayout" className="h-screen flex overflow-hidden bg-white">
        <Sidebar
          navItems={[
            { key: 'dashboard', label: 'Dashboard', active: false, onClick: () => { closeSidebar(); navigate('/dashboard') }, icon: <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /></svg> },
            { key: 'historial', label: 'Historial', active: false, onClick: () => { closeSidebar(); navigate('/historial') }, icon: <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 12h18" /><path d="M7 6h10" /><path d="M7 18h10" /></svg> },
            { key: 'parcelas', label: 'Parcelas', active: false, onClick: openParcelasModal, icon: <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M15 22a1 1 0 0 1-1-1v-4a1 1 0 0 1 .445-.832l3-2a1 1 0 0 1 1.11 0l3 2A1 1 0 0 1 22 17v4a1 1 0 0 1-1 1z" /><path d="M18 10a8 8 0 0 0-16 0c0 4.993 5.539 10.193 7.399 11.799a1 1 0 0 0 .601.2" /><path d="M18 22v-3" /><circle cx="10" cy="10" r="3" /></svg> },
            { key: 'newchat', label: 'Nueva conversacion', active: false, onClick: newChat, icon: <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg> },
          ]}
          hideWeather
          user={{ displayName, email: userEmail, profilePhotoUrl, initials }}
          onProfile={() => setShowProfileModal(true)}
          onSettings={() => setShowSettingsModal(true)}
          onLogout={handleLogout}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={setSidebarOpen}
          sidebarId="chatbot-sidebar"
        >
          <p className="text-[0.68rem] font-semibold uppercase tracking-widest text-gray-400 mt-1 px-1">Recientes</p>
          <ul id="historyList" className="flex flex-col gap-1 overflow-y-auto flex-1">
            {sortedConversations.length === 0 ? (
              <p className="text-xs text-gray-300 px-2">Sin conversaciones aun</p>
            ) : (
              sortedConversations.map(conv => (
                <li key={conv.id} className={`session-card rounded-xl border transition w-full cursor-pointer ${activeConvId === conv.id ? 'bg-brand-50 border-brand-200 text-brand-800' : 'bg-white border-transparent text-gray-500 hover:bg-brand-50 hover:text-brand-700'}`} onClick={() => selectConversation(conv)}>
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
                </li>
              ))
            )}
          </ul>
        </Sidebar>

        {/* MAIN */}
        <main className="flex-1 flex flex-col overflow-hidden bg-white min-w-0">
          {/* CHAT AREA */}
          <div id="chatArea" ref={chatAreaRef} className="flex-1 overflow-y-auto px-3 sm:px-4 py-5 relative">
            {showWelcome && messages.length === 0 ? (
              <WelcomeScreen
                displayName={displayName}
                farms={farms}
                openAddFarmModal={openAddFarmModal}
                suggest={suggest}
              />
            ) : (
              <div id="msgs" className="max-w-2xl mx-auto flex flex-col gap-4 sm:gap-5">
                {messages.map((msg, i) => {
                  let cardData = null
                  if (msg.type === 'analysis-card') {
                    cardData = msg
                  } else if (msg.content?.startsWith('{"__type":"analysis_card"')) {
                    try { cardData = JSON.parse(msg.content) } catch {}
                  }
                  return (
                  <div key={i}>
                    {cardData ? (
                      <AnalysisCard cardData={cardData} />
                    ) : msg.role === 'user' ? (
                      <UserBubble content={msg.content} imagePath={msg.image_path} />
                    ) : msg.content ? (
                      <AssistantBubble
                        content={msg.content}
                        msgId={msg.id}
                        streamDoneIds={streamDoneIds}
                        copiedIndex={copiedIndex}
                        index={i}
                        onCopy={handleCopy}
                        onFormatBotText={formatBotText}
                      />
                    ) : null}
                  </div>
                  )
                })}
                {sending && <LoadingDots />}
                <SuggestedQuestions questions={suggestedQuestions} onSelect={handleSuggestionClick} />
              </div>
            )}
          </div>

          {/* INPUT ZONE */}
          <div className="input-zone px-3 sm:px-4 pt-2 bg-white border-t border-gray-100 flex-shrink-0">
            <div className="max-w-2xl mx-auto">
              {/* Hint: usuario sin corporaciones agrícolas intenta interactuar */}
              {showNoFarmHint && farms.length === 0 && (
                <div className="farm-hint mb-3 flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
                  <svg className="w-4 h-4 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-amber-900 leading-tight">Primero registra tu corporación agrícola</p>
                    <p className="text-xs text-amber-700 mt-0.5">Necesitas al menos una parcela para empezar el análisis.</p>
                  </div>
                  <button onClick={() => { setShowNoFarmHint(false); openAddFarmModal() }} className="flex-shrink-0 text-xs font-bold text-brand-700 bg-brand-50 border border-brand-200 rounded-full px-3 py-1.5 hover:bg-brand-100 transition btn-reset">
                    Crear corporación agrícola
                  </button>
                  <button onClick={() => setShowNoFarmHint(false)} className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-100 text-amber-500 hover:bg-amber-200 flex items-center justify-center transition icon-btn">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                  </button>
                </div>
              )}

              {/* Hint: tiene corporación agrícola pero no ha seleccionado contexto (parcela) en esta sesión */}
              {showNoContextHint && !savedContextIdRef.current && (
                <div className="farm-hint mb-3 flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-2xl px-4 py-3">
                  <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-blue-900 leading-tight">Selecciona una parcela primero</p>
                    <p className="text-xs text-blue-700 mt-0.5">Para analizar una imagen necesitas vincularla a una parcela de tu cultivo.</p>
                  </div>
                  <button
                    onClick={() => { setShowNoContextHint(false); setShowContextModal(true) }}
                    className="flex-shrink-0 text-xs font-bold text-blue-700 bg-blue-100 border border-blue-200 rounded-full px-3 py-1.5 hover:bg-blue-200 transition btn-reset"
                  >
                    Seleccionar parcela
                  </button>
                  <button onClick={() => setShowNoContextHint(false)} className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-500 hover:bg-blue-200 flex items-center justify-center transition icon-btn">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                  </button>
                </div>
              )}
              <div id="imgPreview" className={`${imagePreview ? 'flex' : 'hidden'} items-center gap-3 mb-3 px-1`}>
                <div className="relative">
                  <img id="previewImg" src={imagePreview || ''} alt="preview" className="h-14 w-14 sm:h-16 sm:w-16 object-cover rounded-2xl border border-brand-200 shadow-sm" />
                  <button onClick={removeImage} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gray-700 hover:bg-gray-900 rounded-full flex items-center justify-center transition icon-btn">
                    <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                  </button>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-600" id="imgName">{imageFile?.name || 'imagen.jpg'}</p>
                  <p className="text-xs text-gray-400">Imagen lista para enviar</p>
                </div>
              </div>
              <div className="input-box flex items-end gap-1.5 sm:gap-2 bg-gray-50 border border-gray-200 rounded-3xl px-2.5 sm:px-3 py-2.5 sm:py-3 transition-all duration-200">
                <button
                  onClick={() => {
                    if (farms.length === 0) { setShowNoFarmHint(true); return }
                    if (!savedContextIdRef.current) { setShowNoContextHint(true); return }
                    fileInputRef.current?.click()
                  }}
                  title="Adjuntar imagen"
                  className="flex-shrink-0 mb-0.5 p-1.5 rounded-full hover:bg-brand-50 active:bg-brand-100 transition text-gray-400 hover:text-brand-600 btn-reset"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                </button>
                <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleImageSelect} />
                <textarea
                  ref={inpRef}
                  value={inputValue}
                  onChange={e => { setInputValue(e.target.value); if (e.target.value) setSuggestedQuestions([]) }}
                  onKeyDown={handleKeyDown}
                  onFocus={() => { if (farms.length === 0) setShowNoFarmHint(true) }}
                  rows="1"
                  placeholder={farms.length === 0 ? 'Registra una corporación agrícola para comenzar...' : 'Escribe sobre tu cultivo...'}
                  className="flex-1 text-sm text-gray-800 placeholder-gray-400 leading-relaxed max-h-32 overflow-y-auto py-0.5"
                />
                <button ref={micRef} onClick={toggleMic} title="Usar microfono" className="flex-shrink-0 mb-0.5 w-8 h-8 rounded-full bg-gray-100 hover:bg-brand-50 active:bg-brand-100 flex items-center justify-center transition-all duration-200 icon-btn">
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
      <ProfileModal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} />

      {/* SETTINGS MODAL */}
      <SettingsModal isOpen={showSettingsModal} onClose={() => setShowSettingsModal(false)} />

      <ContextModal
        show={showContextModal}
        modalRef={contextSelModalRef}
        farms={farms}
        contextSelectedFarmId={contextSelectedFarmId}
        contextSelectedZone={contextSelectedZone}
        contextSelectedPlotId={contextSelectedPlotId}
        weatherData={weatherData}
        weatherLoading={weatherLoading}
        weatherCondition={weatherCondition}
        contextDatetimeRef={contextDatetimeRef}
        contextLotRef={contextLotRef}
        contextZoneRef={contextZoneRef}
        contextRowsRef={contextRowsRef}
        contextPlantRef={contextPlantRef}
        contextLocationRef={contextLocationRef}
        contextSymptomRef={contextSymptomRef}
        contextPartRef={contextPartRef}
        contextStageRef={contextStageRef}
        contextSeverityRef={contextSeverityRef}
        contextIrrigationRef={contextIrrigationRef}
        contextPhytoRef={contextPhytoRef}
        contextNotesRef={contextNotesRef}
        setShowContextModal={setShowContextModal}
        setContextSelectedFarmId={setContextSelectedFarmId}
        setContextSelectedZone={setContextSelectedZone}
        setContextSelectedPlotId={setContextSelectedPlotId}
        setWeatherData={setWeatherData}
        setWeatherCondition={setWeatherCondition}
        openParcelasModal={openParcelasModal}
        handleSaveContext={handleSaveContext}
        fileInputRef={fileInputRef}
      />

      <ParcelasModal
        show={showParcelasModal}
        modalRef={parcelasModalRef}
        farms={farms}
        onClose={closeParcelasModal}
        openAddFarmModal={openAddFarmModal}
        openAddPlotModal={openAddPlotModal}
        openEditFarmModal={openEditFarmModal}
        openEditPlotModal={openEditPlotModal}
        handleDeleteFarm={handleDeleteFarm}
        handleDeletePlot={handleDeletePlot}
        handleSelectPlot={handleSelectPlot}
      />

      <AddFarmModal
        show={showAddFarmModal}
        modalRef={addFarmModalRef}
        editingFarm={editingFarm}
        farmName={farmName}
        farmLocation={farmLocation}
        farmError={farmError}
        setShowAddFarmModal={setShowAddFarmModal}
        setFarmName={setFarmName}
        setFarmLocation={setFarmLocation}
        setFarmError={setFarmError}
        handleCreateFarm={handleCreateFarm}
      />

      <AddPlotModal
        show={showAddPlotModal}
        modalRef={addPlotModalRef}
        selectedFarmForPlot={selectedFarmForPlot}
        editingPlot={editingPlot}
        plotName={plotName}
        plotGps={plotGps}
        plotGpsCoords={plotGpsCoords}
        plotHectares={plotHectares}
        plotZone={plotZone}
        plotRows={plotRows}
        plotError={plotError}
        setShowAddPlotModal={setShowAddPlotModal}
        setPlotName={setPlotName}
        setPlotGps={setPlotGps}
        setPlotGpsCoords={setPlotGpsCoords}
        setPlotHectares={setPlotHectares}
        setPlotZone={setPlotZone}
        setPlotRows={setPlotRows}
        setPlotError={setPlotError}
        handleCreatePlot={handleCreatePlot}
      />

      <ConfirmDeleteModal
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="¿Eliminar corporación agrícola?"
        message="Se eliminaran todas las parcelas asociadas a esta corporación agrícola."
        onConfirm={() => handleDeleteFarm(confirmDelete)}
      />
    </>
  )
}