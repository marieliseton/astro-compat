import { useState, useRef, useEffect } from 'react'
import { calculateScore, buildAstroSummary } from './astrology.js'

const RAPIDAPI_KEY = import.meta.env.VITE_RAPIDAPI_KEY || ''
const GEMINI_KEY = import.meta.env.VITE_GEMINI_KEY || ''

const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash']

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function fallbackInterpretation(score, p1Name, p2Name) {
  if (score >= 80) {
    return `${p1Name} et ${p2Name} partagent une vraie fluidité — les mots viennent naturellement, les silences aussi. C'est le genre de lien où l'on n'a pas besoin de tout expliquer pour être compris. Profitez-en : c'est rare.`
  }
  if (score >= 65) {
    return `${p1Name} et ${p2Name} fonctionnent bien ensemble, avec une vraie complémentarité qui compense leurs différences. Quelques ajustements de rythme suffiront à rendre cette relation très solide. Le potentiel est là, il demande juste un peu d'attention.`
  }
  if (score >= 50) {
    return `${p1Name} et ${p2Name} ont suffisamment en commun pour construire quelque chose de beau, même si leurs approches diffèrent parfois. Ce qui peut sembler être une friction est souvent ce qui les fait grandir l'un l'autre. Avec de la bienveillance, cette relation peut devenir une vraie force.`
  }
  return `${p1Name} et ${p2Name} ont des personnalités distinctes qui se complètent de façon inattendue. Les différences demandent plus d'efforts de communication, mais elles apportent aussi de la richesse. Une relation qui grandit avec le temps.`
}

async function generateInterpretation(prompt, score, p1Name, p2Name) {
  if (!GEMINI_KEY) {
    return { texte: fallbackInterpretation(score, p1Name, p2Name), source: 'fallback', reason: 'VITE_GEMINI_KEY manquante' }
  }

  let lastError = ''

  for (const model of GEMINI_MODELS) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const resp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
          }
        )

        if (resp.ok) {
          const data = await resp.json()
          const texte = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || ''
          if (texte) return { texte, source: 'gemini' }
          lastError = 'Réponse vide de Gemini'
          break
        }

        const errBody = await resp.json().catch(() => ({}))
        lastError = errBody?.error?.message || `Gemini API ${resp.status}`
        console.log('[v0] Gemini error', model, resp.status, lastError)

        if (resp.status === 429) {
          await sleep(1200 * (attempt + 1))
          continue
        }
        break
      } catch (e) {
        lastError = e.message
        await sleep(800 * (attempt + 1))
      }
    }
  }

  return {
    texte: fallbackInterpretation(score, p1Name, p2Name),
    source: 'fallback',
    reason: lastError,
  }
}

async function getTimezone(lat, lng) {
  try {
    const res = await fetch(`https://timeapi.io/api/TimeZone/coordinate?latitude=${lat}&longitude=${lng}`)
    if (res.ok) {
      const data = await res.json()
      if (data.timeZone) return data.timeZone
    }
  } catch { /* ignore */ }
  return 'UTC'
}

async function geocodeCity(cityInput) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cityInput)}&format=json&limit=1&addressdetails=1`
  const res = await fetch(url, { headers: { 'Accept-Language': 'fr' } })
  const data = await res.json()
  if (!data.length) throw new Error(`Ville introuvable : ${cityInput}`)
  const p = data[0]
  const lat = parseFloat(p.lat)
  const lng = parseFloat(p.lon)
  const tz = await getTimezone(lat, lng)
  return {
    lat,
    lng,
    city: p.address.city || p.address.town || p.address.village || cityInput.split(',')[0],
    country: p.address.country_code?.toUpperCase() || 'FR',
    tz,
  }
}

function parseDate(raw) {
  return { day: parseInt(raw.slice(0,2)), month: parseInt(raw.slice(2,4)), year: parseInt(raw.slice(4,8)) }
}
function parseTime(raw) {
  return { hour: parseInt(raw.slice(0,2)), minute: parseInt(raw.slice(2,4)) }
}

function renderDateMask(raw) {
  const ph = 'rgba(0,0,0,0.28)', fi = '#000'
  const jj = raw.slice(0,2), mm = raw.slice(2,4), aaaa = raw.slice(4,8)
  const jjH = jj ? `<span style="color:${fi}">${jj}</span>` : `<span style="color:${ph}">JJ</span>`
  const mmH = mm ? `<span style="color:${fi}">${mm}</span>` : `<span style="color:${ph}">MM</span>`
  const aaH = aaaa
    ? `<span style="color:${fi}">${aaaa}</span>${aaaa.length < 4 ? `<span style="color:${ph}">${'A'.repeat(4-aaaa.length)}</span>` : ''}`
    : `<span style="color:${ph}">AAAA</span>`
  const s1 = jj.length===2 ? fi : ph
  const s2 = mm.length===2 ? fi : ph
  return jjH+`<span style="color:${s1}">/</span>`+mmH+`<span style="color:${s2}">/</span>`+aaH
}

function renderTimeMask(raw) {
  const ph = 'rgba(0,0,0,0.28)', fi = '#000'
  const hh = raw.slice(0,2), mn = raw.slice(2,4)
  const hhH = hh ? `<span style="color:${fi}">${hh}</span>` : `<span style="color:${ph}">hh</span>`
  const mnH = mn ? `<span style="color:${fi}">${mn}</span>` : `<span style="color:${ph}">mm</span>`
  return hhH+`<span style="color:${hh.length===2?fi:ph}">:</span>`+mnH
}

// ── Champ texte ──
function FieldText({ top, label, value, onChange, onEnter, inputRef }) {
  const [active, setActive] = useState(false)
  const localRef = useRef(null)
  const ref = inputRef || localRef
  const hasValue = value.trim().length > 0
  const showLabel = !hasValue && !active

  return (
    <div style={{ position:'absolute', left:'calc(50% - 161px)', top, width:322, height:55, display:'flex', alignItems:'center', paddingLeft:30, cursor:'text' }}
      onClick={() => ref.current?.focus()}>
      {showLabel && (
        <span style={{ position:'absolute', left:30, fontFamily:"'IM Fell DW Pica',serif", fontSize:20, letterSpacing:'-0.04em', color:'#000', pointerEvents:'none', whiteSpace:'nowrap' }}>{label}</span>
      )}
      <input ref={ref} type="text" value={value}
        enterKeyHint="next"
        style={{ fontFamily:"'IM Fell DW Pica',serif", fontSize:20, letterSpacing:'-0.04em', color:'#000', background:'none', border:'none', outline:'none', width:'100%' }}
        onFocus={() => setActive(true)}
        onBlur={() => setActive(false)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); onEnter?.() } }}
        onChange={e => onChange(e.target.value)} />
    </div>
  )
}

// ── Champ ville ──
function FieldVille({ top, label, value, onChange, onConfirm, onEnter, inputRef }) {
  const [active, setActive] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [showDrop, setShowDrop] = useState(false)
  const timer = useRef(null)
  const localRef = useRef(null)
  const ref = inputRef || localRef
  const hasValue = value.trim().length > 0

  async function fetchSugg(q) {
    if (q.length < 2) { setSuggestions([]); setShowDrop(false); return }
    clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=8&addressdetails=1&featuretype=city`, { headers: { 'Accept-Language':'fr' } })
        const data = await res.json()
        const seen = {}
        const items = data.map(p => {
          const city = p.address.city||p.address.town||p.address.village||p.address.municipality||p.display_name.split(',')[0].trim()
          const country = p.address.country||''
          return city+(country?', '+country:'')
        }).filter(l => { if(seen[l]) return false; seen[l]=1; return true })
        setSuggestions(items)
        setShowDrop(items.length > 0)
      } catch { setSuggestions([]); setShowDrop(false) }
    }, 100)
  }

  function pick(s) {
    onChange(s)
    onConfirm(s)   // signale que la ville a été choisie dans le dropdown
    setShowDrop(false)
    setSuggestions([])
  }

  const showLabel = !hasValue && !active

  return (
    <div style={{ position:'absolute', left:'calc(50% - 161px)', top, width:322, zIndex:10 }}>
      <div style={{ height:55, display:'flex', alignItems:'center', paddingLeft:30, cursor:'text', position:'relative' }} onClick={() => ref.current?.focus()}>
        {showLabel && (
          <span style={{ position:'absolute', left:30, fontFamily:"'IM Fell DW Pica',serif", fontSize:20, letterSpacing:'-0.04em', color:'#000', pointerEvents:'none', whiteSpace:'nowrap' }}>{label}</span>
        )}
        <input ref={ref} type="text" autoComplete="off" value={value}
          enterKeyHint="next"
          style={{ fontFamily:"'IM Fell DW Pica',serif", fontSize:20, letterSpacing:'-0.04em', color:'#000', background:'none', border:'none', outline:'none', width:'100%' }}
          onFocus={() => setActive(true)}
          onBlur={() => setTimeout(() => { setActive(false); setShowDrop(false) }, 200)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault()
              if (showDrop && suggestions.length > 0) { pick(suggestions[0]); onEnter?.() }
            } else if (e.key === 'Tab') {
              e.preventDefault()
              if (showDrop && suggestions.length > 0) pick(suggestions[0])
              onEnter?.()
            }
          }}
          onChange={e => {
            onChange(e.target.value)
            onConfirm(null)  // reset confirmation quand l'utilisateur tape manuellement
            fetchSugg(e.target.value)
          }} />
      </div>
      {showDrop && (
        <div style={{ position:'absolute', top:55, left:0, width:'100%', background:'rgba(255,255,255,0.95)', backdropFilter:'blur(20px)', borderRadius:10, boxShadow:'0 4px 20px rgba(0,0,0,0.12)', overflow:'hidden', zIndex:100 }}>
          {suggestions.map((s,i) => (
            <div key={i} onMouseDown={() => pick(s)} onTouchEnd={() => pick(s)}
              style={{ padding:'11px 16px', fontFamily:'-apple-system, BlinkMacSystemFont, sans-serif', fontSize:15, color:'#1c1c1e', cursor:'pointer', borderBottom: i < suggestions.length-1 ? '0.5px solid rgba(0,0,0,0.08)' : 'none' }}
              onMouseEnter={e => e.currentTarget.style.background='rgba(0,0,0,0.05)'}
              onMouseLeave={e => e.currentTarget.style.background='transparent'}>
              {s}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Champ date ──
function FieldDate({ top, label, dateRaw, onDateChange, onEnter, inputRef }) {
  const [active, setActive] = useState(false)
  const localRef = useRef(null)
  const ref = inputRef || localRef
  const hasValue = dateRaw.length > 0
  return (
    <div style={{ position:'absolute', left:'calc(50% - 161px)', top, width:322, height:55, display:'flex', alignItems:'center', paddingLeft:30, cursor:'text' }}
      onClick={() => { setActive(true); ref.current?.focus() }}>
      {!hasValue && !active && (
        <span style={{ fontFamily:"'IM Fell DW Pica',serif", fontSize:20, letterSpacing:'-0.04em', color:'#000', pointerEvents:'none', whiteSpace:'nowrap' }}>{label}</span>
      )}
      {(hasValue || active) && (
        <div style={{ fontFamily:"'IM Fell DW Pica',serif", fontSize:20, letterSpacing:'-0.04em', color:'#000', pointerEvents:'none' }}
          dangerouslySetInnerHTML={{ __html: renderDateMask(dateRaw) }} />
      )}
      <input ref={ref} type="text" inputMode="numeric" maxLength={8}
        value={dateRaw}
        enterKeyHint="next"
        style={{ position:'absolute', top:0, left:0, width:'100%', height:'100%', opacity:0, border:'none', background:'transparent', fontSize:16, padding:'0 30px', cursor:'text' }}
        onFocus={() => setActive(true)}
        onChange={e => {
          let d = e.target.value.replace(/\D/g,'').slice(0,8)
          // jour : 1er chiffre max 3
          if (d.length >= 1 && parseInt(d[0]) > 3) d = '3' + d.slice(1)
          // jour : 01–31
          if (d.length >= 2) { const j=parseInt(d.slice(0,2)); if(j===0) d='01'+d.slice(2); else if(j>31) d='31'+d.slice(2) }
          // mois : 1er chiffre max 1
          if (d.length >= 3 && parseInt(d[2]) > 1) d = d.slice(0,2)+'1'+d.slice(3)
          // mois : 01–12
          if (d.length >= 4) { const m=parseInt(d.slice(2,4)); if(m===0) d=d.slice(0,2)+'01'+d.slice(4); else if(m>12) d=d.slice(0,2)+'12'+d.slice(4) }
          onDateChange(d)
        }}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); onEnter?.() } }}
        onBlur={() => setActive(false)} />
    </div>
  )
}

// ── Champ heure ──
function FieldTime({ top, label, timeRaw, onTimeChange, onEnter, inputRef }) {
  const [active, setActive] = useState(false)
  const localRef = useRef(null)
  const ref = inputRef || localRef
  const hasValue = timeRaw.length > 0
  return (
    <div style={{ position:'absolute', left:'calc(50% - 161px)', top, width:322, height:55, display:'flex', alignItems:'center', paddingLeft:30, cursor:'text' }}
      onClick={() => { setActive(true); ref.current?.focus() }}>
      {!hasValue && !active && (
        <span style={{ fontFamily:"'IM Fell DW Pica',serif", fontSize:20, letterSpacing:'-0.04em', color:'#000', pointerEvents:'none', whiteSpace:'nowrap' }}>{label}</span>
      )}
      {(hasValue || active) && (
        <div style={{ fontFamily:"'IM Fell DW Pica',serif", fontSize:20, letterSpacing:'-0.04em', color:'#000', pointerEvents:'none' }}
          dangerouslySetInnerHTML={{ __html: renderTimeMask(timeRaw) }} />
      )}
      <input ref={ref} type="text" inputMode="numeric" maxLength={4}
        value={timeRaw}
        enterKeyHint="done"
        style={{ position:'absolute', top:0, left:0, width:'100%', height:'100%', opacity:0, border:'none', background:'transparent', fontSize:16, padding:'0 30px', cursor:'text' }}
        onFocus={() => setActive(true)}
        onChange={e => {
          let d = e.target.value.replace(/\D/g,'').slice(0,4)
          // heure : 1er chiffre max 2
          if (d.length >= 1 && parseInt(d[0]) > 2) d = '2' + d.slice(1)
          // heure : 00–23
          if (d.length >= 2) { const h=parseInt(d.slice(0,2)); if(h>23) d='23'+d.slice(2) }
          // minutes : 1er chiffre max 5
          if (d.length >= 3 && parseInt(d[2]) > 5) d = d.slice(0,2)+'5'+d.slice(3)
          onTimeChange(d)
        }}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); onEnter?.() } }}
        onBlur={() => setActive(false)} />
    </div>
  )
}

// ── Écran formulaire ──
function FormScreen({ visible, bgStyle, deco, ctaColor, labels, data, onChange, onVilleConfirm, onSubmit, error }) {
  const refVille = useRef(null)
  const refDate = useRef(null)
  const refTime = useRef(null)

  return (
    <div style={{ width:'100%', height:'100%', position:'absolute', top:0, left:0, overflow:'hidden',
      transition:'opacity 0.4s ease',
      opacity: visible ? 1 : 0, pointerEvents: visible ? 'all' : 'none' }}>

      <div style={{ position:'absolute', top:0, left:0, width:'100%', height:'100%', backgroundSize:'cover', backgroundPosition:'center', ...bgStyle }} />

      {deco && <div style={{ position:'absolute', left:'50%', transform:'translateX(-50%)', top:62, fontFamily:"'IM Fell DW Pica',serif", fontSize:20, letterSpacing:'-0.04em', color:ctaColor||'#000', textAlign:'center' }}>{deco}</div>}

      {[126,194,262,330].map(t => (
        <div key={t} style={{ position:'absolute', width:322, height:55, left:'calc(50% - 161px)', top:t, background:'#FFF', filter:'blur(12.65px)', borderRadius:100 }} />
      ))}

      <FieldText  top={126} label={labels[0]} value={data.prenom}  onChange={v => onChange('prenom', v)} onEnter={() => refVille.current?.focus()} />
      <FieldVille top={194} label={labels[1]} value={data.ville} onChange={v => onChange('ville', v)} onConfirm={v => onVilleConfirm(v)} onEnter={() => refDate.current?.focus()} inputRef={refVille} />
      <FieldDate  top={262} label={labels[2]} dateRaw={data.dateRaw} onDateChange={v => onChange('dateRaw', v)} onEnter={() => refTime.current?.focus()} inputRef={refDate} />
      <FieldTime  top={330} label={labels[3]} timeRaw={data.timeRaw} onTimeChange={v => onChange('timeRaw', v)} onEnter={onSubmit} inputRef={refTime} />

      {error && (
        <div style={{ position:'absolute', left:'calc(50% - 161px)', width:322, top:405, fontFamily:"'IM Fell DW Pica',serif", fontSize:14, fontStyle:'italic', color:ctaColor||'#a0485a', textAlign:'center' }}>{error}</div>
      )}

      <button onClick={onSubmit} style={{ position:'absolute', left:'calc(50% - 74px)', top:'75%', width:148, fontFamily:"'IM Fell DW Pica',serif", fontSize:20, letterSpacing:'-0.04em', color:ctaColor||'#000', background:'none', border:'none', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
        valider
        <span style={{ display:'block', width:50, height:1, background:ctaColor||'#000' }} />
      </button>
    </div>
  )
}

// ── Spark cursor ──
function SparkCursor() {
  useEffect(() => {
    const canvas = document.createElement('canvas')
    canvas.style.cssText = 'position:fixed;top:0;left:0;pointer-events:none;z-index:99999'
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    document.body.appendChild(canvas)
    const ctx = canvas.getContext('2d')

    const onResize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    window.addEventListener('resize', onResize)

    const particles = []

    function drawStar(x, y, r, alpha) {
      const inner = r * 0.3
      ctx.save()
      ctx.globalAlpha = alpha
      ctx.translate(x, y)
      ctx.rotate(Math.PI / 4)
      const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 3)
      glow.addColorStop(0, 'rgba(255,210,60,0.35)')
      glow.addColorStop(1, 'rgba(255,180,0,0)')
      ctx.fillStyle = glow
      ctx.beginPath()
      ctx.arc(0, 0, r * 3, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      for (let i = 0; i < 8; i++) {
        const rad = i % 2 === 0 ? r : inner
        const angle = (i * Math.PI) / 4
        i === 0 ? ctx.moveTo(Math.cos(angle) * rad, Math.sin(angle) * rad)
                : ctx.lineTo(Math.cos(angle) * rad, Math.sin(angle) * rad)
      }
      ctx.closePath()
      const grad = ctx.createLinearGradient(-r, -r, r, r)
      grad.addColorStop(0, '#fffbe0')
      grad.addColorStop(0.4, '#ffd84d')
      grad.addColorStop(1, '#c8860a')
      ctx.fillStyle = grad
      ctx.fill()
      ctx.restore()
    }

    function spawnSpark(x, y) {
      const angle = Math.random() * Math.PI * 2
      const speed = Math.random() * 2 + 0.5
      particles.push({
        x, y,
        r: Math.random() * 2.5 + 1,
        alpha: Math.random() * 0.4 + 0.6,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        decay: Math.random() * 0.008 + 0.005,
      })
    }

    const onMouseMove = (e) => { for (let i = 0; i < 6; i++) spawnSpark(e.clientX, e.clientY) }
    window.addEventListener('mousemove', onMouseMove)

    let raf
    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.vy += 0.07
        p.x += p.vx
        p.y += p.vy
        p.vx *= 0.99
        p.alpha -= p.decay
        p.r *= 0.993
        if (p.alpha <= 0 || p.r < 0.3) { particles.splice(i, 1); continue }
        drawStar(p.x, p.y, p.r, Math.max(0, p.alpha))
      }
      raf = requestAnimationFrame(animate)
    }
    animate()

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('mousemove', onMouseMove)
      document.body.removeChild(canvas)
    }
  }, [])

  return null
}

// ── Star grid background ──
const STAR_SYMBOLS = [
  '✩','✧','＊','*','˚','₊','⁺','°','✦','⋆','˖','•','‧','ੈ',
  '★','✪','☆','。','❤','◌','➶','ᕯ','💫','✱','｡','✰','✨',
  '｡','･',':','˚','☆','✦','✧','✩','✦','☆','✨','⁺','°',
  '✩','✦','✧','✨','☆','✪','★','⋆','✧','✦','✩','✨','˚','•'
]
const STAR_COLORS = [
  '#3d3dcc','#5a5af0','#7b5ea7','#9b59b6','#c45aec',
  '#e91e8c','#ff6b9d','#f48fb1','#d63384',
  '#00bcd4','#26c6da','#4dd0e1','#80deea',
  '#7986cb','#5c6bc0','#3949ab','#283593',
  '#ce93d8','#ba68c8','#ab47bc','#ec407a','#f06292','#ff4081'
]
const HOVER_COLORS = [
  '#e74c3c','#e67e22','#f1c40f','#2ecc71','#3498db','#9b59b6','#e91e8c',
  '#ff6b9d','#ffd700','#00bcd4','#8bc34a','#ff5722','#c0392b','#1abc9c'
]

function StarGrid() {
  const ref = useRef(null)

  useEffect(() => {
    const container = ref.current
    if (!container) return
    let cells = []
    let hoverIdx = 0
    let shuffleTimer, twinkleTimer

    function build() {
      container.innerHTML = ''
      cells = []
      const W = container.offsetWidth
      const H = container.offsetHeight
      const CELL = 32
      const cols = Math.ceil(W / CELL)
      const rows = Math.ceil(H / CELL)
      container.style.display = 'grid'
      container.style.gridTemplateColumns = `repeat(${cols}, 1fr)`
      container.style.gridTemplateRows = `repeat(${rows}, 1fr)`

      for (let i = 0; i < cols * rows; i++) {
        const cell = document.createElement('div')
        cell.style.cssText = 'display:flex;align-items:center;justify-content:center;font-size:18px;cursor:default;user-select:none;transition:color 0.08s,transform 0.1s;'
        cell.textContent = STAR_SYMBOLS[Math.floor(Math.random() * STAR_SYMBOLS.length)]
        const c = STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)]
        cell.style.color = c
        cell.dataset.baseColor = c
        container.appendChild(cell)
        cells.push(cell)
      }
    }

    function twinkle() {
      const n = Math.floor(Math.random() * 4) + 1
      for (let i = 0; i < n; i++) {
        const cell = cells[Math.floor(Math.random() * cells.length)]
        if (!cell || cell.dataset.painted) continue
        cell.textContent = STAR_SYMBOLS[Math.floor(Math.random() * STAR_SYMBOLS.length)]
        cell.style.transition = 'color 0.05s,transform 0.05s'
        cell.style.color = '#fff'
        cell.style.transform = 'scale(1.2)'
        setTimeout(() => {
          cell.style.color = cell.dataset.baseColor
          cell.style.transform = ''
        }, 150 + Math.random() * 200)
      }
      twinkleTimer = setTimeout(twinkle, 80 + Math.random() * 250)
    }

    function paintCell(cell) {
      if (!cell || !cell.dataset.baseColor) return
      cell.textContent = STAR_SYMBOLS[Math.floor(Math.random() * STAR_SYMBOLS.length)]
      const color = HOVER_COLORS[hoverIdx++ % HOVER_COLORS.length]
      cell.style.color = color
      cell.dataset.painted = '1'
      cell.style.transform = 'scale(1.3)'
    }

    function onMouseOver(e) { paintCell(e.target) }

    function onTouchMove(e) {
      e.preventDefault()
      const touch = e.touches[0]
      const el = document.elementFromPoint(touch.clientX, touch.clientY)
      if (el && el.dataset.baseColor) paintCell(el)
    }

    function onTouchStart(e) {
      const touch = e.touches[0]
      const el = document.elementFromPoint(touch.clientX, touch.clientY)
      if (el && el.dataset.baseColor) paintCell(el)
    }

    build()
    twinkle()
    container.addEventListener('mouseover', onMouseOver)
    container.addEventListener('touchmove', onTouchMove, { passive: false })
    container.addEventListener('touchstart', onTouchStart, { passive: true })
    const ro = new ResizeObserver(build)
    ro.observe(container)

    return () => {
      clearTimeout(twinkleTimer)
      container.removeEventListener('mouseover', onMouseOver)
      container.removeEventListener('touchmove', onTouchMove)
      container.removeEventListener('touchstart', onTouchStart)
      ro.disconnect()
    }
  }, [])

  return <div ref={ref} style={{ position:'absolute', inset:0, overflow:'hidden' }} />
}

// ── App principale ──
const SCREEN_BG = { 1: '#ffffff', 2: '#FF589B', 3: '#78D119', 4: '#FFFEEE' }

export default function App() {
  const [screen, setScreen] = useState(1)
  const [formKey, setFormKey] = useState(0)

  useEffect(() => {
    const color = SCREEN_BG[screen] || '#fff'
    document.body.style.background = color
    document.documentElement.style.background = color
  }, [screen])
  const [p1, setP1] = useState({ prenom:'', ville:'', dateRaw:'', timeRaw:'' })
  const [p2, setP2] = useState({ prenom:'', ville:'', dateRaw:'', timeRaw:'' })
  const [ville1Ok, setVille1Ok] = useState(false)
  const [ville2Ok, setVille2Ok] = useState(false)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error1, setError1] = useState('')
  const [error2, setError2] = useState('')

  function updateP1(k,v) { setP1(p => ({...p, [k]:v})) }
  function updateP2(k,v) { setP2(p => ({...p, [k]:v})) }

  function validateP1() {
    if (!p1.prenom.trim()) { setError1('Merci de renseigner votre prénom.'); return false }
    if (!p1.ville.trim() || !ville1Ok) { setError1('Sélectionnez une ville dans la liste.'); return false }
    if (p1.dateRaw.length < 8) { setError1('Date incomplète (JJ/MM/AAAA).'); return false }
    if (p1.timeRaw.length < 4) { setError1('Heure incomplète (hhmm).'); return false }
    setError1(''); return true
  }

  function validateP2() {
    if (!p2.prenom.trim()) { setError2('Merci de renseigner son prénom.'); return false }
    if (!p2.ville.trim() || !ville2Ok) { setError2('Sélectionnez une ville dans la liste.'); return false }
    if (p2.dateRaw.length < 8) { setError2('Date incomplète (JJ/MM/AAAA).'); return false }
    if (p2.timeRaw.length < 4) { setError2('Heure incomplète (hhmm).'); return false }
    setError2(''); return true
  }

  async function calculate() {
    setLoading(true)
    setScreen(4)
    try {
      const [geo1, geo2] = await Promise.all([geocodeCity(p1.ville), geocodeCity(p2.ville)])
      const d1=parseDate(p1.dateRaw), t1=parseTime(p1.timeRaw)
      const d2=parseDate(p2.dateRaw), t2=parseTime(p2.timeRaw)

      const subject1 = { name:p1.prenom, year:d1.year, month:d1.month, day:d1.day, hour:t1.hour, minute:t1.minute, city:geo1.city, nation:geo1.country, longitude:geo1.lng, latitude:geo1.lat, timezone:geo1.tz }
      const subject2 = { name:p2.prenom, year:d2.year, month:d2.month, day:d2.day, hour:t2.hour, minute:t2.minute, city:geo2.city, nation:geo2.country, longitude:geo2.lng, latitude:geo2.lat, timezone:geo2.tz }

      const synResp = await fetch('https://astrologer.p.rapidapi.com/api/v5/chart-data/synastry', {
        method:'POST',
        headers:{ 'Content-Type':'application/json', 'X-RapidAPI-Host':'astrologer.p.rapidapi.com', 'X-RapidAPI-Key':RAPIDAPI_KEY },
        body: JSON.stringify({
          first_subject: subject1,
          second_subject: subject2,
          active_points: ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Ascendant'],
          active_aspects: [
            { name: 'conjunction', orb: 8 },
            { name: 'opposition', orb: 8 },
            { name: 'trine', orb: 7 },
            { name: 'square', orb: 7 },
            { name: 'sextile', orb: 6 },
          ],
        })
      })
      if (!synResp.ok) throw new Error(`Astrologer API ${synResp.status}`)
      const synData = await synResp.json()

      const aspectsArr = synData?.aspects || synData?.chart_data?.aspects || synData?.data?.aspects || []
      console.log('[astro] aspects reçus:', aspectsArr.length, synData)

      const score = calculateScore(aspectsArr, synData)
      const astroSummary = buildAstroSummary(
        { aspects: aspectsArr, first_subject: synData?.first_subject || synData?.chart_data?.first_subject, second_subject: synData?.second_subject || synData?.chart_data?.second_subject },
        p1.prenom, p2.prenom
      )

      const prompt = `Tu es un astrologue bienveillant spécialisé en synastrie occidentale. Voici les données de compatibilité entre ${p1.prenom} et ${p2.prenom} :

${astroSummary}

Score global : ${score}/100

Écris exactement 3 phrases séparées par un saut de ligne. Pas de titre, pas d'emoji, pas de numéros, pas de tirets.
— Phrase 1 : la force principale de ce lien, ce qui les attire et les unit.
— Phrase 2 : un défi à surmonter ensemble (formulé de façon constructive, pas négative).
— Phrase 3 : un encouragement sincère et un conseil pour faire durer ce lien.

Règles absolues :
- Utilise leurs prénoms (${p1.prenom} et ${p2.prenom}).
- Zéro vocabulaire astrologique (pas de signe, trigone, aspect, maison, planète).
- Ton chaleureux et positif — même si le score est moyen, il y a toujours quelque chose de beau à souligner.
- Phrases courtes, directes, sans métaphores lourdes.`
      const { texte, source, reason } = await generateInterpretation(prompt, score, p1.prenom, p2.prenom)
      if (source === 'fallback') {
        console.log('[v0] Interprétation de secours utilisée. Raison:', reason)
      }
      setResult({ score, texte })
    } catch(err) {
      setResult({ error: err.message })
    } finally {
      setLoading(false)
    }
  }

  function restart() {
    setScreen(1); setResult(null)
    setP1({ prenom:'', ville:'', dateRaw:'', timeRaw:'' })
    setP2({ prenom:'', ville:'', dateRaw:'', timeRaw:'' })
    setVille1Ok(false); setVille2Ok(false)
    setFormKey(k => k + 1)
  }

  const visible = (n) => ({
    opacity: screen===n ? 1 : 0,
    pointerEvents: screen===n ? 'all' : 'none',
  })

  return (
    <div style={{ position:'fixed', top:0, left:0, right:0, bottom:0, overflow:'hidden' }}>
      {/* ── SCREEN 1 ── */}
      <div style={{ width:'100%', height:'100%', position:'absolute', top:0, left:0, background:'#fff', overflow:'hidden', transition:'opacity 0.4s, transform 0.4s', ...visible(1) }}>
        <StarGrid />

        {/* blur pill */}
        <div style={{ position:'absolute', width:272, height:128, left:'calc(50% - 136px)', top:'calc(50% - 64px)', background:'#fff', filter:'blur(12.65px)', borderRadius:100, pointerEvents:'none' }} />

        {/* titre */}
        <div style={{ position:'absolute', width:242, left:'calc(50% - 121px)', top:'calc(50% - 52.5px)', fontFamily:"'IM Fell DW Pica',serif", fontStyle:'italic', fontSize:40, lineHeight:'35px', textAlign:'center', letterSpacing:'-0.04em', color:'#0B0B0B', pointerEvents:'none' }}>
          Découvrez votre compatibilité astral
        </div>

        {/* bouton bleu glossy */}
        <button onClick={() => setScreen(2)} style={{ position:'absolute', left:'calc(50% - 77.5px)', top:'calc(50% + 93px)', width:155, height:52, background:'linear-gradient(180deg,#E3F5FE 0%,#0063E7 49.52%,#60D9FE 100%)', border:'1px solid #0052BC', borderRadius:100, cursor:'pointer', overflow:'hidden', padding:0 }}>
          {/* glossy highlight */}
          <div style={{ position:'absolute', left:'calc(50% - 65.5px)', top:2, width:131, height:25, background:'linear-gradient(181.02deg,#E1F0FF 12.94%,rgba(225,240,255,0.4) 56.69%,rgba(17,110,233,0.5) 92.77%)', borderRadius:100, pointerEvents:'none' }} />
          <span style={{ position:'relative', fontFamily:"'IM Fell DW Pica',serif", fontSize:24, letterSpacing:'-0.04em', color:'#fff', textShadow:'0px 1px 1.6px #0164E7', lineHeight:'52px' }}>
            Commencer
          </span>
        </button>
      </div>

      {/* ── SCREEN 2 ── */}
      <FormScreen
        key={`s2-${formKey}`}
        visible={screen===2}
        bgStyle={{ background:'linear-gradient(180.02deg, #FF589B 28.82%, #FFB962 99.98%)' }}
        deco="₊˚⊹☆"
        ctaColor="#FFFBC9"
        labels={['votre prénom','votre ville de naissance','votre date de naissance','votre heure de naissance']}
        data={p1} onChange={updateP1} onVilleConfirm={v => setVille1Ok(!!v)} error={error1}
        onSubmit={() => { if(validateP1()) setScreen(3) }}
      />

      {/* ── SCREEN 3 ── */}
      <FormScreen
        key={`s3-${formKey}`}
        visible={screen===3}
        bgStyle={{ background:'linear-gradient(180deg, #78D119 0%, #FFF827 100%)' }}
        deco="✮ ⋆ ˚｡𖦹 ⋆｡°✩"
        ctaColor="#000000"
        labels={['son prénom','sa ville de naissance','sa date de naissance','son heure de naissance']}
        data={p2} onChange={updateP2} onVilleConfirm={v => setVille2Ok(!!v)} error={error2}
        onSubmit={() => { if(validateP2()) calculate() }}
      />

      {/* ── SCREEN 4 ── */}
      <div style={{ width:'100%', height:'100%', position:'absolute', top:0, left:0, background:'#FFFEEE', overflow:'hidden', transition:'opacity 0.4s', ...visible(4) }}>

        {loading && (
          <div style={{ position:'absolute', top:0, left:0, width:'100%', height:'100%', background:'#FFFEEE', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:16 }}>
            <div style={{ fontSize:32, color:'#795275', animation:'spin 3s linear infinite' }}>✦</div>
            <p style={{ fontFamily:"'IM Fell DW Pica',serif", fontStyle:'italic', fontSize:20, color:'#795275', letterSpacing:'-0.04em' }}>
              nous calculons votre compatibilité<span className="dots" />
            </p>
          </div>
        )}

        {!loading && result && !result.error && (
          <div style={{ position:'absolute', top:0, left:0, width:'100%', height:'100%', overflowY:'auto', WebkitOverflowScrolling:'touch', background:'#FFFEEE' }}>
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', paddingTop:80, paddingBottom:80 }}>
              <div style={{ fontFamily:"'IM Fell DW Pica',serif", fontStyle:'italic', fontSize:24, lineHeight:'30px', textAlign:'center', letterSpacing:'-0.04em', color:'#795275', marginBottom:16 }}>votre compatibilité</div>
              <div style={{ display:'flex', alignItems:'flex-start' }}>
                <div style={{ fontFamily:"'IM Fell DW Pica',serif", fontStyle:'italic', fontSize:160, lineHeight:'1', letterSpacing:'-0.04em', color:'#795275' }}>{result.score}</div>
                <div style={{ fontFamily:"'IM Fell DW Pica',serif", fontStyle:'italic', fontSize:36, lineHeight:'1', letterSpacing:'-0.04em', color:'#795275', marginTop:18 }}>%</div>
              </div>
              <div style={{ width:'min(353px, 88vw)', fontFamily:"'IM Fell DW Pica',serif", fontStyle:'italic', fontSize:24, lineHeight:'34px', letterSpacing:'-0.04em', color:'#795275', marginTop:32, textAlign:'left' }}>{result.texte}</div>
              <button onClick={restart} style={{ marginTop:48, fontFamily:"'IM Fell DW Pica',serif", fontSize:16, letterSpacing:'-0.04em', color:'#795275', background:'none', border:'none', cursor:'pointer', textDecoration:'underline', textUnderlineOffset:4 }}>recommencer</button>
            </div>
          </div>
        )}

        {!loading && result?.error && (
          <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', textAlign:'center', padding:20, fontFamily:"'IM Fell DW Pica',serif", fontStyle:'italic', color:'#795275', fontSize:20 }}>
            <p>Une erreur est survenue.</p>
            <p style={{ fontSize:14, marginTop:8, opacity:0.6 }}>{result.error}</p>
            <button onClick={() => { setScreen(3); setResult(null) }} style={{ marginTop:20, fontFamily:"'IM Fell DW Pica',serif", fontSize:16, color:'#795275', background:'none', border:'none', cursor:'pointer', textDecoration:'underline' }}>← retour</button>
          </div>
        )}
      </div>

      {/* ── DEV NAV ── */}
      {import.meta.env.DEV && (
        <div style={{ position:'absolute', bottom:16, left:'50%', transform:'translateX(-50%)', display:'flex', gap:8, zIndex:9999, background:'rgba(0,0,0,0.15)', padding:'6px 10px', borderRadius:99 }}>
          {[1,2,3,4].map(n => (
            <button key={n} onClick={() => setScreen(n)}
              style={{ width:8, height:8, borderRadius:'50%', background: screen===n ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.25)', border:'none', cursor:'pointer', padding:0 }} />
          ))}
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform:rotate(0deg) } to { transform:rotate(360deg) } }
        .dots::after { content:''; animation: dots 1.5s steps(4,end) infinite; }
        @keyframes dots { 0%{content:''} 25%{content:'.'} 50%{content:'..'} 75%{content:'...'} }
      `}</style>
    </div>
  )
}
