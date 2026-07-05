const COMMON_PASSWORDS = new Set([
  '12345678', 'password', '123456789', '1234567890', 'qwerty123',
  'abc123', '12345678910', 'password123', 'iloveyou', 'admin123',
  'welcome1', 'monkey', 'dragon', 'master', 'shadow',
  'sunshine', 'princess', 'football', 'baseball', 'trustno1',
])

export function validateEcuadorianDni(dni) {
  if (!/^\d{10}$/.test(dni)) return 'La cédula debe tener exactamente 10 dígitos'

  const province = parseInt(dni.substring(0, 2), 10)
  if (province < 1 || province > 24) return 'Los primeros 2 dígitos deben corresponder a una provincia válida (01-24)'

  const weights = [2, 1, 2, 1, 2, 1, 2, 1, 2]
  let sum = 0
  for (let i = 0; i < 9; i++) {
    let product = parseInt(dni[i], 10) * weights[i]
    if (product >= 10) product -= 9
    sum += product
  }

  const verifier = parseInt(dni[9], 10)
  const calculated = (10 - (sum % 10)) % 10

  if (verifier !== calculated) return 'La cédula no es válida (dígito verificador incorrecto)'

  return null
}

export function validateEcuadorianPhone(phone) {
  const cleaned = phone.replace(/[\s-]/g, '')
  if (!/^\d{10}$/.test(cleaned)) return 'El teléfono debe tener 10 dígitos'
  if (!cleaned.startsWith('0')) return 'El teléfono debe comenzar con 0'
  return null
}

function isSimilarToUserAttributes(password, { first_name, last_name, username, email }) {
  const lowerPwd = password.toLowerCase()
  const attrs = [first_name, last_name, username]
  if (email) attrs.push(email.split('@')[0])

  for (const attr of attrs) {
    if (!attr) continue
    const lowerAttr = attr.toLowerCase()
    if (lowerAttr.length < 3) continue
    if (lowerPwd.includes(lowerAttr)) return true
    if (lowerAttr.includes(lowerPwd)) return true
  }
  return false
}

export function validateLogin(form) {
  const errors = {}
  if (!form.username?.trim()) errors.username = 'El usuario es obligatorio'
  if (!form.password) errors.password = 'La contraseña es obligatoria'
  return errors
}

export function validateRegistration(form) {
  const errors = {}

  if (!form.first_name?.trim()) {
    errors.first_name = 'El nombre es obligatorio'
  }

  if (!form.last_name?.trim()) {
    errors.last_name = 'El apellido es obligatorio'
  }

  if (!form.email?.trim()) {
    errors.email = 'El correo electrónico es obligatorio'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.email = 'Ingresa un correo electrónico válido'
  }

  if (!form.username?.trim()) {
    errors.username = 'El usuario es obligatorio'
  } else if (!/^[\w.@+-]+$/.test(form.username)) {
    errors.username = 'Solo se permiten letras, números y @/./+/-/_'
  }

  if (!form.password1) {
    errors.password1 = 'La contraseña es obligatoria'
  } else {
    if (form.password1.length < 8) {
      errors.password1 = 'La contraseña debe tener al menos 8 caracteres'
    } else if (/^\d+$/.test(form.password1)) {
      errors.password1 = 'La contraseña no puede ser solo números'
    } else if (COMMON_PASSWORDS.has(form.password1.toLowerCase())) {
      errors.password1 = 'Esta contraseña es demasiado común'
    } else if (isSimilarToUserAttributes(form.password1, form)) {
      errors.password1 = 'La contraseña es demasiado similar a tus datos personales'
    }
  }

  if (!form.password2) {
    errors.password2 = 'Debes confirmar la contraseña'
  } else if (form.password1 !== form.password2) {
    errors.password2 = 'Las contraseñas no coinciden'
  }

  if (!form.dni?.trim()) {
    errors.dni = 'La cédula es obligatoria'
  } else {
    const dniError = validateEcuadorianDni(form.dni.trim())
    if (dniError) errors.dni = dniError
  }

  if (!form.phone?.trim()) {
    errors.phone = 'El teléfono es obligatorio'
  } else {
    const phoneError = validateEcuadorianPhone(form.phone.trim())
    if (phoneError) errors.phone = phoneError
  }

  return errors
}
