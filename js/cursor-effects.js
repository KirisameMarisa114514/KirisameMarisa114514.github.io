(() => {
  'use strict'

  const CANVAS_ID = 'cursor-effects-canvas'
  const TAU = Math.PI * 2
  const MAX_PARTICLES = 96
  const TRAIL_INTERVAL = 32
  const TRAIL_DISTANCE = 8
  const TRAIL_COLORS = ['#ff8fba', '#7de7ff', '#c7a6ff']
  const STAR_COLORS = ['#ffd166', '#fff0a8', '#7de7ff', '#c7a6ff']
  const HEART_COLORS = ['#ff5f9e', '#ff82b4', '#ffabc9']

  if (document.getElementById(CANVAS_ID)) return

  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d', {
    alpha: true,
    desynchronized: true
  })

  if (!context) return

  canvas.id = CANVAS_ID
  canvas.setAttribute('aria-hidden', 'true')
  Object.assign(canvas.style, {
    position: 'fixed',
    inset: '0',
    width: '100vw',
    height: '100vh',
    pointerEvents: 'none',
    zIndex: '11',
    display: 'block',
    contain: 'strict'
  })

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  const particles = []
  let width = 0
  let height = 0
  let animationFrame = 0
  let lastFrameTime = 0
  let lastTrailTime = 0
  let lastTrailX = Number.NaN
  let lastTrailY = Number.NaN
  let resizeTimer = 0
  let running = false

  const random = (min, max) => Math.random() * (max - min) + min
  const pick = colors => colors[Math.floor(Math.random() * colors.length)]

  const addParticle = particle => {
    if (particles.length >= MAX_PARTICLES) {
      particles.shift()
    }

    particles.push(particle)
  }

  const clearCanvas = () => {
    context.clearRect(0, 0, width, height)
  }

  const stop = (clear = false) => {
    running = false
    window.cancelAnimationFrame(animationFrame)
    animationFrame = 0

    if (clear) clearCanvas()
  }

  const start = () => {
    if (running || particles.length === 0 || reducedMotion.matches || document.hidden) return

    running = true
    lastFrameTime = performance.now()
    animationFrame = window.requestAnimationFrame(render)
  }

  const createTrailParticle = (x, y) => {
    const life = random(0.38, 0.62)

    addParticle({
      type: 'trail',
      x: x + random(-2.5, 2.5),
      y: y + random(-2.5, 2.5),
      velocityX: random(-7, 7),
      velocityY: random(8, 20),
      size: random(2.2, 4.6),
      rotation: random(0, TAU),
      spin: random(-2, 2),
      life,
      maxLife: life,
      color: pick(TRAIL_COLORS),
      sparkle: Math.random() < 0.3
    })

    start()
  }

  const createClickBurst = (x, y) => {
    const type = Math.random() < 0.5 ? 'heart' : 'star'
    const colors = type === 'heart' ? HEART_COLORS : STAR_COLORS
    const count = width < 768 ? 7 : 10

    for (let index = 0; index < count; index += 1) {
      const angle = (TAU * index) / count + random(-0.22, 0.22)
      const speed = random(48, 112)
      const life = random(0.65, 0.95)

      addParticle({
        type,
        x,
        y,
        velocityX: Math.cos(angle) * speed,
        velocityY: Math.sin(angle) * speed - random(12, 30),
        size: random(type === 'heart' ? 6 : 5, type === 'heart' ? 10 : 9),
        rotation: random(0, TAU),
        spin: random(-3.2, 3.2),
        life,
        maxLife: life,
        color: pick(colors)
      })
    }

    start()
  }

  const traceStar = (outerRadius, innerRadius, points = 5) => {
    context.beginPath()

    for (let index = 0; index < points * 2; index += 1) {
      const radius = index % 2 === 0 ? outerRadius : innerRadius
      const angle = -Math.PI / 2 + (Math.PI * index) / points
      const x = Math.cos(angle) * radius
      const y = Math.sin(angle) * radius

      if (index === 0) {
        context.moveTo(x, y)
      } else {
        context.lineTo(x, y)
      }
    }

    context.closePath()
  }

  const drawTrail = (particle, alpha) => {
    context.save()
    context.translate(particle.x, particle.y)
    context.rotate(particle.rotation)
    context.fillStyle = particle.color

    if (particle.sparkle) {
      context.globalAlpha = alpha
      traceStar(particle.size * 1.45, particle.size * 0.24, 4)
      context.fill()
    } else {
      context.globalAlpha = alpha * 0.18
      context.beginPath()
      context.arc(0, 0, particle.size * 2.1, 0, TAU)
      context.fill()
      context.globalAlpha = alpha
      context.beginPath()
      context.arc(0, 0, particle.size, 0, TAU)
      context.fill()
    }

    context.restore()
  }

  const drawHeart = (particle, alpha, scale) => {
    const size = particle.size

    context.save()
    context.translate(particle.x, particle.y)
    context.rotate(particle.rotation)
    context.scale(scale, scale)
    context.globalAlpha = alpha
    context.fillStyle = particle.color
    context.beginPath()
    context.moveTo(0, size * 0.38)
    context.bezierCurveTo(
      -size * 0.72,
      -size * 0.08,
      -size * 0.58,
      -size * 0.72,
      0,
      -size * 0.36
    )
    context.bezierCurveTo(
      size * 0.58,
      -size * 0.72,
      size * 0.72,
      -size * 0.08,
      0,
      size * 0.38
    )
    context.fill()
    context.restore()
  }

  const drawStar = (particle, alpha, scale) => {
    context.save()
    context.translate(particle.x, particle.y)
    context.rotate(particle.rotation)
    context.scale(scale, scale)
    context.globalAlpha = alpha
    context.fillStyle = particle.color
    traceStar(particle.size, particle.size * 0.43)
    context.fill()
    context.restore()
  }

  const drawParticle = particle => {
    const remaining = Math.max(0, particle.life / particle.maxLife)

    if (particle.type === 'trail') {
      drawTrail(particle, remaining * remaining)
      return
    }

    const elapsed = 1 - remaining
    const scale = elapsed < 0.14 ? elapsed / 0.14 : 1
    const alpha = Math.min(1, remaining * 1.8)

    if (particle.type === 'heart') {
      drawHeart(particle, alpha, scale)
    } else {
      drawStar(particle, alpha, scale)
    }
  }

  const updateParticle = (particle, delta) => {
    particle.life -= delta
    particle.x += particle.velocityX * delta
    particle.y += particle.velocityY * delta
    particle.rotation += particle.spin * delta

    const drag = Math.pow(particle.type === 'trail' ? 0.94 : 0.975, delta * 60)
    particle.velocityX *= drag
    particle.velocityY *= drag
    particle.velocityY += (particle.type === 'trail' ? 10 : 72) * delta
  }

  function render(timestamp) {
    if (!running) return

    const delta = Math.min((timestamp - lastFrameTime) / 1000 || 0, 0.033)
    lastFrameTime = timestamp
    clearCanvas()

    for (let index = particles.length - 1; index >= 0; index -= 1) {
      const particle = particles[index]
      updateParticle(particle, delta)

      if (particle.life <= 0) {
        particles.splice(index, 1)
      } else {
        drawParticle(particle)
      }
    }

    if (particles.length === 0) {
      stop(true)
    } else {
      animationFrame = window.requestAnimationFrame(render)
    }
  }

  const resizeCanvas = () => {
    width = Math.max(1, window.innerWidth)
    height = Math.max(1, window.innerHeight)

    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = Math.round(width * pixelRatio)
    canvas.height = Math.round(height * pixelRatio)
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
  }

  const handlePointerMove = event => {
    if (
      reducedMotion.matches ||
      document.hidden ||
      (event.pointerType !== 'mouse' && event.pointerType !== 'pen')
    ) {
      return
    }

    const now = performance.now()
    const distance = Math.hypot(event.clientX - lastTrailX, event.clientY - lastTrailY)

    if (now - lastTrailTime < TRAIL_INTERVAL || distance < TRAIL_DISTANCE) return

    lastTrailTime = now
    lastTrailX = event.clientX
    lastTrailY = event.clientY
    createTrailParticle(event.clientX, event.clientY)
  }

  const handlePointerDown = event => {
    if (
      reducedMotion.matches ||
      document.hidden ||
      event.isPrimary === false ||
      (typeof event.button === 'number' && event.button > 0)
    ) {
      return
    }

    createClickBurst(event.clientX, event.clientY)
  }

  const handleVisibilityChange = () => {
    if (document.hidden) {
      particles.length = 0
      stop(true)
    }
  }

  const handleMotionPreference = event => {
    canvas.hidden = event.matches

    if (event.matches) {
      particles.length = 0
      stop(true)
    }
  }

  const handleResize = () => {
    window.clearTimeout(resizeTimer)
    resizeTimer = window.setTimeout(resizeCanvas, 120)
  }

  const mount = () => {
    document.body.appendChild(canvas)
    canvas.hidden = reducedMotion.matches
    resizeCanvas()

    window.addEventListener('pointermove', handlePointerMove, { passive: true })
    window.addEventListener('pointerdown', handlePointerDown, { passive: true })
    window.addEventListener('resize', handleResize, { passive: true })
    document.addEventListener('visibilitychange', handleVisibilityChange)

    if (typeof reducedMotion.addEventListener === 'function') {
      reducedMotion.addEventListener('change', handleMotionPreference)
    } else {
      reducedMotion.addListener(handleMotionPreference)
    }
  }

  if (document.body) {
    mount()
  } else {
    document.addEventListener('DOMContentLoaded', mount, { once: true })
  }
})()
