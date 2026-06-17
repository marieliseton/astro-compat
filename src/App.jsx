import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import {
  calculateChart, calculateSynastry, calculateCompatibilityScore,
  buildCompatibilityPrompt, buildLocalContent, compatibilityCache,
} from './lib/astrology/index.ts'

const GEMINI_KEY   = import.meta.env.VITE_GEMINI_KEY || ''
const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash']
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// ── Helpers ──────────────────────────────────────────────────────────────────

function dateFmt(raw) {
  if (raw.length <= 2) return raw
  if (raw.length <= 4) return raw.slice(0,2) + '/' + raw.slice(2)
  return raw.slice(0,2) + '/' + raw.slice(2,4) + '/' + raw.slice(4)
}

function timeFmt(raw) {
  if (raw.length <= 2) return raw
  return raw.slice(0,2) + ':' + raw.slice(2)
}

function parseDate(raw) {
  return { day: parseInt(raw.slice(0,2)), month: parseInt(raw.slice(2,4)), year: parseInt(raw.slice(4,8)) }
}
function parseTime(raw) {
  return { hour: parseInt(raw.slice(0,2)), minute: parseInt(raw.slice(2,4)) }
}

// ── API ───────────────────────────────────────────────────────────────────────

async function generateStructuredInterpretation(prompt, score, p1Name, p2Name, aspects) {
  if (!GEMINI_KEY) {
    return { content: buildLocalContent(aspects, p1Name, p2Name, score), source: 'fallback' }
  }
  let lastError = ''
  for (const model of GEMINI_MODELS) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const resp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`,
          { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ contents:[{ parts:[{ text:prompt }] }] }) }
        )
        if (resp.ok) {
          const data = await resp.json()
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || ''
          if (text) {
            try {
              const match = text.match(/\{[\s\S]*\}/)
              if (match) {
                const parsed = JSON.parse(match[0])
                const ok = ['harmony','tension','dynamic','evolution']
                  .every(k => typeof parsed[k] === 'string' && parsed[k].trim().length > 0)
                if (ok) {
                  return { content: {
                    harmony: parsed.harmony.trim(),
                    tension: parsed.tension.trim(),
                    dynamic: parsed.dynamic.trim(),
                    evolution: parsed.evolution.trim(),
                  }, source: 'gemini' }
                }
              }
            } catch { /* essayer le modèle suivant */ }
          }
          lastError = `Réponse non structurée (${model})`
          break
        }
        lastError = (await resp.json().catch(()=>({}))).error?.message || `Gemini ${resp.status}`
        if (resp.status === 429) { await sleep(1200*(attempt+1)); continue }
        break
      } catch(e) { lastError = e.message; await sleep(800*(attempt+1)) }
    }
  }
  console.log('[astro] fallback local:', lastError)
  return { content: buildLocalContent(aspects, p1Name, p2Name, score), source: 'fallback', reason: lastError }
}

async function getTimezone(lat, lng) {
  try {
    const res = await fetch(`https://timeapi.io/api/TimeZone/coordinate?latitude=${lat}&longitude=${lng}`)
    if (res.ok) { const d = await res.json(); if (d.timeZone) return d.timeZone }
  } catch { /* ignore */ }
  return 'UTC'
}

async function geocodeCity(cityInput) {
  const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cityInput)}&format=json&limit=1&addressdetails=1`, { headers:{'Accept-Language':'fr'} })
  const data = await res.json()
  if (!data.length) throw new Error(`Ville introuvable : ${cityInput}`)
  const p = data[0]
  const lat = parseFloat(p.lat), lng = parseFloat(p.lon)
  return {
    lat, lng,
    city: p.address.city || p.address.town || p.address.village || cityInput.split(',')[0],
    country: p.address.country_code?.toUpperCase() || 'FR',
    tz: await getTimezone(lat, lng),
  }
}

// ── Styles communs ────────────────────────────────────────────────────────────

const INPUT_STYLE = {
  fontFamily: "'IM Fell DW Pica',serif",
  fontSize: 20,
  letterSpacing: '-0.04em',
  color: '#000',
  background: 'none',
  border: 'none',
  outline: 'none',
  width: '100%',
}
const LABEL_STYLE = {
  position: 'absolute',
  left: 30,
  fontFamily: "'IM Fell DW Pica',serif",
  fontSize: 20,
  letterSpacing: '-0.04em',
  color: '#000',
  pointerEvents: 'none',
  whiteSpace: 'nowrap',
}
const FIELD_WRAP = (top) => ({
  position: 'absolute',
  left: 'calc(50% - 161px)',
  top,
  width: 322,
  height: 55,
  display: 'flex',
  alignItems: 'center',
  paddingLeft: 30,
  cursor: 'text',
})

// ── Champ texte ───────────────────────────────────────────────────────────────
// Uncontrolled input: React ne touche jamais value sur re-render → pas de blink iOS

function FieldText({ top, label, onEnter, inputRef }) {
  const [hasVal, setHasVal] = useState(false)
  const localRef = useRef(null)
  const ref = inputRef || localRef
  return (
    <div style={FIELD_WRAP(top)} onClick={() => ref.current?.focus()}>
      {!hasVal && <span style={LABEL_STYLE}>{label}</span>}
      <input ref={ref} type="text" enterKeyHint="next" style={INPUT_STYLE}
        onFocus={() => setHasVal(true)}
        onBlur={() => setHasVal(!!ref.current?.value)}
        onChange={e => setHasVal(!!e.target.value)}
        onKeyDown={e => { if (e.key==='Enter'||e.key==='Tab') { e.preventDefault(); onEnter?.() } }}
      />
    </div>
  )
}

// ── Champ ville ───────────────────────────────────────────────────────────────
// Uncontrolled input: la valeur vit dans le DOM, pick() écrit ref.current.value directement

function FieldVille({ top, label, onConfirm, onEnter, inputRef }) {
  const [hasVal, setHasVal] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [showDrop, setShowDrop] = useState(false)
  const timer = useRef(null)
  const localRef = useRef(null)
  const ref = inputRef || localRef

  async function fetchSugg(q) {
    if (q.length < 2) { setSuggestions([]); setShowDrop(false); return }
    clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=8&addressdetails=1&featuretype=city`, { headers:{'Accept-Language':'fr'} })
        const data = await res.json()
        const seen = {}
        const items = data.map(p => {
          const city = p.address.city||p.address.town||p.address.village||p.address.municipality||p.display_name.split(',')[0].trim()
          return city + (p.address.country ? ', '+p.address.country : '')
        }).filter(l => { if(seen[l]) return false; seen[l]=1; return true })
        setSuggestions(items); setShowDrop(items.length > 0)
      } catch { setSuggestions([]); setShowDrop(false) }
    }, 100)
  }

  function pick(s) {
    if (ref.current) ref.current.value = s
    setHasVal(!!s)
    onConfirm(s)
    setShowDrop(false)
    setSuggestions([])
  }

  return (
    <div style={{ position:'absolute', left:'calc(50% - 161px)', top, width:322, zIndex:10 }}>
      <div style={{ height:55, display:'flex', alignItems:'center', paddingLeft:30, cursor:'text', position:'relative' }} onClick={() => ref.current?.focus()}>
        {!hasVal && <span style={LABEL_STYLE}>{label}</span>}
        <input ref={ref} type="text" autoComplete="off" enterKeyHint="next" style={INPUT_STYLE}
          onFocus={() => setHasVal(true)}
          onBlur={() => {
            setHasVal(!!ref.current?.value)
            setTimeout(() => setShowDrop(false), 200)
          }}
          onKeyDown={e => {
            if (e.key==='Enter') { e.preventDefault(); if (showDrop&&suggestions.length) { pick(suggestions[0]); onEnter?.() } }
            else if (e.key==='Tab') { e.preventDefault(); if (showDrop&&suggestions.length) pick(suggestions[0]); onEnter?.() }
          }}
          onChange={e => {
            setHasVal(!!e.target.value)
            onConfirm(null)
            fetchSugg(e.target.value)
          }}
        />
      </div>
      {showDrop && (
        <div style={{ position:'absolute', top:55, left:0, width:'100%', background:'rgba(255,255,255,0.95)', backdropFilter:'blur(20px)', borderRadius:10, boxShadow:'0 4px 20px rgba(0,0,0,0.12)', overflow:'hidden', zIndex:100 }}>
          {suggestions.map((s,i) => (
            <div key={i} onMouseDown={() => pick(s)} onTouchEnd={() => pick(s)}
              style={{ padding:'11px 16px', fontFamily:'-apple-system,BlinkMacSystemFont,sans-serif', fontSize:15, color:'#1c1c1e', cursor:'pointer', borderBottom: i<suggestions.length-1 ? '0.5px solid rgba(0,0,0,0.08)' : 'none' }}
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

// ── Champ date ────────────────────────────────────────────────────────────────
// Uncontrolled: defaultValue + e.target.value manuel → pas de setSelectionRange ni re-render DOM

function FieldDate({ top, label, dateRaw, onDateChange, onEnter, inputRef }) {
  const [hasVal, setHasVal] = useState(!!dateRaw)
  const localRef = useRef(null)
  const ref = inputRef || localRef

  return (
    <div style={FIELD_WRAP(top)} onClick={() => ref.current?.focus()}>
      {!hasVal && <span style={LABEL_STYLE}>{label}</span>}
      <input ref={ref} type="text" inputMode="numeric" defaultValue={dateFmt(dateRaw)} enterKeyHint="next" style={INPUT_STYLE}
        onFocus={() => setHasVal(true)}
        onBlur={() => setHasVal(!!ref.current?.value)}
        onChange={e => {
          let d = e.target.value.replace(/\D/g,'').slice(0,8)
          if (d.length>=1 && parseInt(d[0])>3) d='3'+d.slice(1)
          if (d.length>=2) { const j=parseInt(d.slice(0,2)); if(j===0) d='01'+d.slice(2); else if(j>31) d='31'+d.slice(2) }
          if (d.length>=3 && parseInt(d[2])>1) d=d.slice(0,2)+'1'+d.slice(3)
          if (d.length>=4) { const m=parseInt(d.slice(2,4)); if(m===0) d=d.slice(0,2)+'01'+d.slice(4); else if(m>12) d=d.slice(0,2)+'12'+d.slice(4) }
          onDateChange(d)
          e.target.value = dateFmt(d)
          setHasVal(!!d)
        }}
        onKeyDown={e => {
          if (e.key==='Backspace' && (ref.current?.value||'').endsWith('/')) {
            e.preventDefault()
            const newRaw = dateRaw.slice(0,-1)
            onDateChange(newRaw)
            if (ref.current) ref.current.value = dateFmt(newRaw)
          }
          if (e.key==='Enter'||e.key==='Tab') { e.preventDefault(); onEnter?.() }
        }}
      />
    </div>
  )
}

// ── Champ heure ───────────────────────────────────────────────────────────────

function FieldTime({ top, label, timeRaw, onTimeChange, onEnter, inputRef }) {
  const [hasVal, setHasVal] = useState(!!timeRaw)
  const localRef = useRef(null)
  const ref = inputRef || localRef

  return (
    <div style={FIELD_WRAP(top)} onClick={() => ref.current?.focus()}>
      {!hasVal && <span style={LABEL_STYLE}>{label}</span>}
      <input ref={ref} type="text" inputMode="numeric" defaultValue={timeFmt(timeRaw)} enterKeyHint="done" style={INPUT_STYLE}
        onFocus={() => setHasVal(true)}
        onBlur={() => setHasVal(!!ref.current?.value)}
        onChange={e => {
          let d = e.target.value.replace(/\D/g,'').slice(0,4)
          if (d.length>=1 && parseInt(d[0])>2) d='2'+d.slice(1)
          if (d.length>=2) { const h=parseInt(d.slice(0,2)); if(h>23) d='23'+d.slice(2) }
          if (d.length>=3 && parseInt(d[2])>5) d=d.slice(0,2)+'5'+d.slice(3)
          onTimeChange(d)
          e.target.value = timeFmt(d)
          setHasVal(!!d)
        }}
        onKeyDown={e => {
          if (e.key==='Backspace' && (ref.current?.value||'').endsWith(':')) {
            e.preventDefault()
            const newRaw = timeRaw.slice(0,-1)
            onTimeChange(newRaw)
            if (ref.current) ref.current.value = timeFmt(newRaw)
          }
          if (e.key==='Enter'||e.key==='Tab') { e.preventDefault(); onEnter?.() }
        }}
      />
    </div>
  )
}

// ── Écran formulaire ──────────────────────────────────────────────────────────
// L'état du formulaire vit ici, pas dans App → aucun re-render de App pendant la saisie

function FormScreen({ visible, bgStyle, deco, ctaColor, labels, onSubmit }) {
  const refPrenom = useRef(null)
  const refVille = useRef(null)
  const refDate = useRef(null)
  const refTime = useRef(null)

  const [dateRaw, setDateRaw] = useState('')
  const [timeRaw, setTimeRaw] = useState('')
  const [villeOk, setVilleOk] = useState(false)
  const [error, setError] = useState('')

  const isMe = labels[0].startsWith('votre')

  function handleSubmit() {
    const prenom = (refPrenom.current?.value || '').trim()
    const ville = (refVille.current?.value || '').trim()
    if (!prenom) { setError(isMe ? 'Merci de renseigner votre prénom.' : 'Merci de renseigner son prénom.'); return }
    if (!ville || !villeOk) { setError('Sélectionnez une ville dans la liste.'); return }
    if (dateRaw.length < 8) { setError('Date incomplète (JJ/MM/AAAA).'); return }
    if (timeRaw.length < 4) { setError('Heure incomplète (HH:MM).'); return }
    setError('')
    onSubmit({ prenom, ville, dateRaw, timeRaw })
  }

  return (
    <div style={{ width:'100%', height:'100%', position:'absolute', top:0, left:0, overflow:'hidden', transition:'opacity 0.4s ease', opacity:visible?1:0, pointerEvents:visible?'all':'none' }}>
      <div style={{ position:'absolute', inset:0, ...bgStyle }} />
      {deco && <div style={{ position:'absolute', left:'50%', transform:'translateX(-50%)', top:62, fontFamily:"'IM Fell DW Pica',serif", fontSize:20, letterSpacing:'-0.04em', color:ctaColor||'#000', textAlign:'center' }}>{deco}</div>}
      {[126,194,262,330].map(t => (
        <div key={t} style={{ position:'absolute', width:322, height:55, left:'calc(50% - 161px)', top:t, background:'#FFF', filter:'blur(12.65px)', borderRadius:100 }} />
      ))}
      <FieldText  top={126} label={labels[0]} onEnter={() => refVille.current?.focus()} inputRef={refPrenom} />
      <FieldVille top={194} label={labels[1]} onConfirm={v => setVilleOk(!!v)} onEnter={() => refDate.current?.focus()} inputRef={refVille} />
      <FieldDate  top={262} label={labels[2]} dateRaw={dateRaw} onDateChange={setDateRaw} onEnter={() => refTime.current?.focus()} inputRef={refDate} />
      <FieldTime  top={330} label={labels[3]} timeRaw={timeRaw} onTimeChange={setTimeRaw} onEnter={handleSubmit} inputRef={refTime} />
      {error && <div style={{ position:'absolute', left:'calc(50% - 161px)', width:322, top:405, fontFamily:"'IM Fell DW Pica',serif", fontSize:14, fontStyle:'italic', color:ctaColor||'#a0485a', textAlign:'center' }}>{error}</div>}
      <button onClick={handleSubmit} style={{ position:'absolute', left:'calc(50% - 74px)', top:'75%', width:148, fontFamily:"'IM Fell DW Pica',serif", fontSize:20, letterSpacing:'-0.04em', color:ctaColor||'#000', background:'none', border:'none', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
        valider
        <span style={{ display:'block', width:50, height:1, background:ctaColor||'#000' }} />
      </button>
    </div>
  )
}

// ── Résultat : expérience à onglets ─────────────────────────────────────────
// Score → catégorie active → texte → navigation entre 4 planètes.
// Pas de scroll, pas d'accordéon. Transition fondu entre catégories.

const PURPLE = '#795275'

const CATEGORIES = [
  { key:'harmony',   label:'harmonie',   symbol:'☉' },
  { key:'tension',   label:'tension',    symbol:'♂' },
  { key:'dynamic',   label:'dynamique',  symbol:'☿' },
  { key:'evolution', label:'évolution',  symbol:'♄' },
]

// Pastille « planète » : disque doré texturé + symbole, état actif/inactif.
function PlanetNav({ cat, active, onSelect }) {
  return (
    <button
      onClick={() => onSelect(cat.key)}
      aria-pressed={active}
      style={{
        background:'none', border:'none', padding:0, cursor:'pointer',
        display:'flex', flexDirection:'column', alignItems:'center', gap:8,
        flex:1,
      }}
    >
      <span
        style={{
          width:52, height:52, borderRadius:'50%',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontFamily:"'Apple Symbols','Segoe UI Symbol',serif", fontStyle:'normal',
          fontSize:20, color: active ? '#6B4A23' : '#8a7a55',
          background:'radial-gradient(circle at 34% 28%, #F6E8BE 0%, #E7CB82 46%, #C9A24B 100%)',
          boxShadow: active
            ? '0 0 0 4px rgba(121,82,117,0.14), 0 8px 20px rgba(201,162,75,0.45), inset 0 -3px 6px rgba(150,110,40,0.35)'
            : 'inset 0 -3px 6px rgba(150,110,40,0.3)',
          opacity: active ? 1 : 0.42,
          transform: active ? 'scale(1)' : 'scale(0.8)',
          transition:'opacity 0.4s ease, transform 0.4s cubic-bezier(0.22,1,0.36,1), box-shadow 0.4s ease',
        }}
      >
        {cat.symbol}
      </span>
      <span
        style={{
          fontFamily:"'IM Fell DW Pica',serif", fontStyle:'italic', fontSize:13,
          letterSpacing:'-0.03em', color:PURPLE,
          opacity: active ? 1 : 0.45,
          fontWeight: active ? 600 : 400,
          transition:'opacity 0.4s ease',
        }}
      >
        {cat.label}
      </span>
    </button>
  )
}

function ResultView({ result, onRestart }) {
  const [active, setActive] = useState('harmony')
  const [shown, setShown]   = useState('harmony')
  const [visible, setVisible] = useState(true)

  // Fondu : sortie complète → changement de contenu → entrée.
  // Le délai (320ms) dépasse la transition d'opacité (300ms) pour que le
  // contenu ne change qu'une fois totalement invisible.
  useEffect(() => {
    if (active === shown) return
    setVisible(false)
    const t = setTimeout(() => { setShown(active); setVisible(true) }, 320)
    return () => clearTimeout(t)
  }, [active, shown])

  const cat  = CATEGORIES.find(c => c.key === shown) || CATEGORIES[0]
  const text = result[shown] || ''

  return (
    <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', padding:'calc(env(safe-area-inset-top) + 48px) 24px calc(env(safe-area-inset-bottom) + 22px)', overflow:'hidden' }}>

      {/* ── Score ── */}
      <div style={{ flexShrink:0, textAlign:'center' }}>
        <div style={{ fontFamily:"'IM Fell DW Pica',serif", fontStyle:'italic', fontSize:21, letterSpacing:'-0.04em', color:PURPLE, opacity:0.85 }}>
          votre compatibilité
        </div>
        <div style={{ fontFamily:"'IM Fell DW Pica',serif", fontStyle:'italic', fontSize:'clamp(96px, 21vh, 140px)', lineHeight:0.95, letterSpacing:'-0.04em', color:PURPLE, marginTop:6 }}>
          {result.score}
        </div>
      </div>

      {/* ── Catégorie active + texte (zone fondue) ── */}
      <div style={{ flex:'1 1 auto', minHeight:0, width:'min(360px, 90vw)', display:'flex', flexDirection:'column', justifyContent:'center', overflow:'hidden' }}>
        <div style={{ opacity:visible?1:0, transition:'opacity 0.3s ease' }}>
          <div style={{ textAlign:'center', marginBottom:18, display:'flex', alignItems:'center', justifyContent:'center', gap:9 }}>
            <span style={{ fontFamily:"'Apple Symbols','Segoe UI Symbol',serif", fontSize:18, color:PURPLE, opacity:0.7 }}>{cat.symbol}</span>
            <span style={{ fontFamily:"'IM Fell DW Pica',serif", fontStyle:'italic', fontSize:24, letterSpacing:'-0.02em', color:PURPLE, textTransform:'capitalize' }}>{cat.label}</span>
          </div>
          <p className="cat-text" style={{ fontFamily:"'IM Fell DW Pica',serif", fontStyle:'italic', fontSize:'clamp(17px, 2.3vh, 20px)', lineHeight:1.55, letterSpacing:'-0.03em', color:PURPLE, textAlign:'left', margin:0 }}>
            {text}
          </p>
        </div>
      </div>

      {/* ── Navigation entre catégories ── */}
      <div style={{ flexShrink:0, width:'min(360px, 92vw)', display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:6, padding:'16px 14px 14px', background:'rgba(255,255,255,0.45)', backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)', borderRadius:26, boxShadow:'0 8px 30px rgba(121,82,117,0.12)' }}>
        {CATEGORIES.map(c => (
          <PlanetNav key={c.key} cat={c} active={c.key === active} onSelect={setActive} />
        ))}
      </div>

      <button onClick={onRestart} style={{ flexShrink:0, marginTop:16, fontFamily:"'IM Fell DW Pica',serif", fontSize:15, letterSpacing:'-0.04em', color:PURPLE, opacity:0.7, background:'none', border:'none', cursor:'pointer', textDecoration:'underline', textUnderlineOffset:4 }}>
        recommencer
      </button>
    </div>
  )
}

// ── Loader tourbillon ─────────────────────────────────────────────────────────

function TourbillonLoader() {
  const containerRef = useRef(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const avail  = Math.min(window.innerWidth * 0.88, 780)
    const R_MAX  = avail * 0.37
    const TURNS  = 5.0
    const R_MIN  = 5
    const START  = Math.PI * 0.10
    const TILT   = 30 * Math.PI / 180
    const D      = 1000
    const k      = Math.log(R_MAX / R_MIN) / (TURNS * 2 * Math.PI)

    const W  = avail
    const H  = Math.ceil(R_MAX * Math.sin(TILT) * 2 * 2.5) + 20
    const cx = W / 2
    const cy = H / 2

    container.style.width    = W + 'px'
    container.style.height   = H + 'px'
    container.style.position = 'relative'
    container.style.flexShrink = '0'

    const SYMS = [
      '✩','✧','✦','⋆','˚','•','‧','✪','☆','✰',
      '✱','ᕯ','₊','°','★','✨','˖','⁺','*','◌',
      '➶','ੈ','✩','✧','✦','⋆','˚','•','✪','☆',
      '✰','✱','₊','°','★','✨','˖','⁺','*','◌',
    ]

    function spiralPt(theta) {
      const r  = R_MAX * Math.exp(-k * theta)
      const a  = START - theta
      const x3 = r * Math.cos(a)
      const z3 = r * Math.sin(a)
      const y3 = -z3 * Math.sin(TILT)
      const zp =  z3 * Math.cos(TILT)
      const s  = D / (D + zp)
      return { x: cx + x3 * s, y: cy + y3 * s, r, s }
    }

    const stars = []
    let prevX = null, prevY = null, si = 0

    for (let i = 0; i <= 12000; i++) {
      const theta = (i / 12000) * TURNS * 2 * Math.PI
      const { x, y, r, s } = spiralPt(theta)
      const dist = prevX === null ? Infinity : Math.sqrt((x - prevX) ** 2 + (y - prevY) ** 2)
      if (dist >= 13) {
        const el = document.createElement('span')
        el.style.position   = 'absolute'
        el.style.transform  = 'translate(-50%,-50%)'
        el.style.fontFamily = "'IM Fell DW Pica',Georgia,serif"
        el.style.color      = '#fff'
        el.style.lineHeight = '1'
        el.style.userSelect = 'none'
        el.style.visibility = 'hidden'
        el.style.left       = x + 'px'
        el.style.top        = y + 'px'
        el.style.fontSize   = Math.max(5, Math.round((7 + (r / R_MAX) * 11) * s)) + 'px'
        el.textContent      = SYMS[si++ % SYMS.length]
        container.appendChild(el)
        stars.push(el)
        prevX = x; prevY = y
      }
    }

    let idx = 0, dir = 1, timer
    function step() {
      if (stars[idx]) stars[idx].style.visibility = dir === 1 ? 'visible' : 'hidden'
      idx += dir
      if (idx >= stars.length) { idx = stars.length - 1; dir = -1 }
      else if (idx < 0)        { idx = 0;                 dir =  1 }
      timer = setTimeout(step, 38)
    }
    step()

    return () => { clearTimeout(timer); container.innerHTML = '' }
  }, [])

  return (
    <div style={{ position:'absolute', inset:0, background:'#0000ff', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:40 }}>
      <div ref={containerRef} />
      <p style={{ fontFamily:"'IM Fell DW Pica',Georgia,serif", fontStyle:'italic', fontSize:18, color:'#fff', letterSpacing:'-0.03em', textAlign:'center' }}>
        nous calculons votre compatibilité<span className="dots" />
      </p>
    </div>
  )
}

// ── Star grid background ──────────────────────────────────────────────────────

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
    let cells = [], hoverIdx = 0, twinkleTimer

    function build() {
      container.innerHTML = ''
      cells = []
      const CELL = 32
      const cols = Math.ceil(container.offsetWidth / CELL)
      const rows = Math.ceil(container.offsetHeight / CELL)
      container.style.display = 'grid'
      container.style.gridTemplateColumns = `repeat(${cols}, 1fr)`
      container.style.gridTemplateRows = `repeat(${rows}, 1fr)`
      for (let i = 0; i < cols*rows; i++) {
        const cell = document.createElement('div')
        cell.style.cssText = 'display:flex;align-items:center;justify-content:center;font-size:18px;cursor:default;user-select:none;transition:color 0.08s,transform 0.1s;'
        cell.textContent = STAR_SYMBOLS[Math.floor(Math.random()*STAR_SYMBOLS.length)]
        const c = STAR_COLORS[Math.floor(Math.random()*STAR_COLORS.length)]
        cell.style.color = c; cell.dataset.baseColor = c
        container.appendChild(cell); cells.push(cell)
      }
    }

    function twinkle() {
      const n = Math.floor(Math.random()*4)+1
      for (let i = 0; i < n; i++) {
        const cell = cells[Math.floor(Math.random()*cells.length)]
        if (!cell || cell.dataset.painted) continue
        cell.textContent = STAR_SYMBOLS[Math.floor(Math.random()*STAR_SYMBOLS.length)]
        cell.style.transition = 'color 0.05s,transform 0.05s'
        cell.style.color = '#fff'; cell.style.transform = 'scale(1.2)'
        setTimeout(() => { cell.style.color=cell.dataset.baseColor; cell.style.transform='' }, 150+Math.random()*200)
      }
      twinkleTimer = setTimeout(twinkle, 80+Math.random()*250)
    }

    function paintCell(cell) {
      if (!cell || !cell.dataset.baseColor) return
      cell.textContent = STAR_SYMBOLS[Math.floor(Math.random()*STAR_SYMBOLS.length)]
      const color = HOVER_COLORS[hoverIdx++ % HOVER_COLORS.length]
      cell.style.color = color; cell.dataset.painted = '1'; cell.style.transform = 'scale(1.3)'
    }

    function onTouchMove(e) {
      e.preventDefault()
      const t = e.touches[0], el = document.elementFromPoint(t.clientX, t.clientY)
      if (el?.dataset.baseColor) paintCell(el)
    }
    function onTouchStart(e) {
      const t = e.touches[0], el = document.elementFromPoint(t.clientX, t.clientY)
      if (el?.dataset.baseColor) paintCell(el)
    }

    build(); twinkle()
    container.addEventListener('mouseover', e => paintCell(e.target))
    container.addEventListener('touchmove', onTouchMove, { passive:false })
    container.addEventListener('touchstart', onTouchStart, { passive:true })
    const ro = new ResizeObserver(build)
    ro.observe(container)

    return () => {
      clearTimeout(twinkleTimer)
      ro.disconnect()
    }
  }, [])

  return <div ref={ref} style={{ position:'absolute', inset:0, overflow:'hidden' }} />
}

// ── Constantes écran ──────────────────────────────────────────────────────────

const SCREEN_TOP    = { 1:'#ffffff', 2:'#FF589B', 3:'#78D119', 4:'#FFFEEE' }
const SCREEN_BOTTOM = { 1:'#ffffff', 2:'#FFB962', 3:'#FFF827', 4:'#FFFEEE' }

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  const [screen, setScreen] = useState(1)
  const [formKey, setFormKey] = useState(0)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const p1Ref = useRef(null)

  // ── iOS 26 : data-screen sur <html> avant le paint ───────────────────────
  useLayoutEffect(() => {
    document.documentElement.setAttribute('data-screen', String(screen))
  }, [screen])

  // ── theme-color : Android Chrome + desktop ────────────────────────────────
  useEffect(() => {
    const topColor = SCREEN_TOP[screen]
    const existing = document.querySelector('meta[name="theme-color"]')
    if (existing) existing.remove()
    const meta = document.createElement('meta')
    meta.name = 'theme-color'
    meta.content = topColor
    document.head.appendChild(meta)
  }, [screen])

  async function calculate(p1, p2) {
    setLoading(true); setScreen(4)
    try {
      const [geo1, geo2] = await Promise.all([geocodeCity(p1.ville), geocodeCity(p2.ville)])
      const d1=parseDate(p1.dateRaw), t1=parseTime(p1.timeRaw)
      const d2=parseDate(p2.dateRaw), t2=parseTime(p2.timeRaw)

      const birthData1 = { year:d1.year, month:d1.month, day:d1.day, hour:t1.hour, minute:t1.minute, latitude:geo1.lat, longitude:geo1.lng, timezone:geo1.tz }
      const birthData2 = { year:d2.year, month:d2.month, day:d2.day, hour:t2.hour, minute:t2.minute, latitude:geo2.lat, longitude:geo2.lng, timezone:geo2.tz }

      const chart1 = calculateChart(birthData1)
      const chart2 = calculateChart(birthData2)

      const cacheKey1 = `${p1.prenom}|${p1.dateRaw}`
      const cacheKey2 = `${p2.prenom}|${p2.dateRaw}`
      const cached = compatibilityCache.get(p1.prenom, cacheKey1, p2.prenom, cacheKey2)
      if (cached) {
        setResult({ score: cached.score, ...cached.content })
        return
      }

      const aspects = calculateSynastry(chart1, chart2)
      const score   = calculateCompatibilityScore(aspects)
      const prompt  = buildCompatibilityPrompt(p1.prenom, p2.prenom, score, aspects)
      const { content, source, reason } = await generateStructuredInterpretation(
        prompt, score, p1.prenom, p2.prenom, aspects
      )
      if (source==='fallback') console.log('[astro] fallback:', reason)

      compatibilityCache.set(p1.prenom, cacheKey1, p2.prenom, cacheKey2, score, content)
      setResult({ score, ...content })
    } catch(err) {
      setResult({ error: err.message })
    } finally {
      setLoading(false)
    }
  }

  function restart() {
    setScreen(1); setResult(null)
    p1Ref.current = null
    setFormKey(k=>k+1)
  }

  const visible = (n) => ({ opacity:screen===n?1:0, pointerEvents:screen===n?'all':'none' })
  const topColor    = SCREEN_TOP[screen]
  const bottomColor = SCREEN_BOTTOM[screen]

  return (
    <>
      {/* Barres safe-area : en dehors du overflow:hidden pour garantir le rendu */}
      <div style={{ position:'fixed', top:0, left:0, right:0, height:'env(safe-area-inset-top)', background:topColor, zIndex:99999, pointerEvents:'none', transition:'background 0.4s' }} />
      <div style={{ position:'fixed', bottom:0, left:0, right:0, height:'env(safe-area-inset-bottom)', background:bottomColor, zIndex:99999, pointerEvents:'none', transition:'background 0.4s' }} />

      <div style={{ position:'fixed', inset:0, overflow:'hidden', backgroundColor:topColor, transition:'background-color 0.4s' }}>

        {/* ── SCREEN 1 ── */}
        <div style={{ position:'absolute', inset:0, background:'#fff', overflow:'hidden', transition:'opacity 0.4s', ...visible(1) }}>
          <StarGrid />
          <div style={{ position:'absolute', width:272, height:128, left:'calc(50% - 136px)', top:'calc(50% - 64px)', background:'#fff', filter:'blur(12.65px)', borderRadius:100, pointerEvents:'none' }} />
          <div style={{ position:'absolute', width:242, left:'calc(50% - 121px)', top:'calc(50% - 52.5px)', fontFamily:"'IM Fell DW Pica',serif", fontStyle:'italic', fontSize:40, lineHeight:'35px', textAlign:'center', letterSpacing:'-0.04em', color:'#0B0B0B', pointerEvents:'none' }}>
            Découvrez votre compatibilité astrale
          </div>
          <button onClick={() => setScreen(2)} style={{ position:'absolute', left:'calc(50% - 77.5px)', top:'calc(50% + 93px)', width:155, height:52, background:'linear-gradient(180deg,#E3F5FE 0%,#0063E7 49.52%,#60D9FE 100%)', border:'1px solid #0052BC', borderRadius:100, cursor:'pointer', overflow:'hidden', padding:0 }}>
            <div style={{ position:'absolute', left:'calc(50% - 65.5px)', top:2, width:131, height:25, background:'linear-gradient(181.02deg,#E1F0FF 12.94%,rgba(225,240,255,0.4) 56.69%,rgba(17,110,233,0.5) 92.77%)', borderRadius:100, pointerEvents:'none' }} />
            <span style={{ position:'relative', fontFamily:"'IM Fell DW Pica',serif", fontSize:24, letterSpacing:'-0.04em', color:'#fff', textShadow:'0px 1px 1.6px #0164E7', lineHeight:'52px' }}>Commencer</span>
          </button>
        </div>

        {/* ── SCREEN 2 ── */}
        <FormScreen key={`s2-${formKey}`} visible={screen===2}
          bgStyle={{ background:'linear-gradient(180.02deg, #FF589B 28.82%, #FFB962 99.98%)' }}
          deco="₊˚⊹☆" ctaColor="#FFFBC9"
          labels={['votre prénom','votre ville de naissance','votre date de naissance','votre heure de naissance']}
          onSubmit={data => { p1Ref.current = data; setScreen(3) }}
        />

        {/* ── SCREEN 3 ── */}
        <FormScreen key={`s3-${formKey}`} visible={screen===3}
          bgStyle={{ background:'linear-gradient(180deg, #78D119 0%, #FFF827 100%)' }}
          deco="✮ ⋆ ˚｡𖦹 ⋆｡°✩" ctaColor="#000000"
          labels={['son prénom','sa ville de naissance','sa date de naissance','son heure de naissance']}
          onSubmit={data => { calculate(p1Ref.current, data) }}
        />

        {/* ── SCREEN 4 ── */}
        <div style={{ position:'absolute', inset:0, background:'#FFFEEE', overflow:'hidden', transition:'opacity 0.4s', ...visible(4) }}>
          {loading && <TourbillonLoader />}
          {!loading && result && !result.error && (
            <ResultView result={result} onRestart={restart} />
          )}
          {!loading && result?.error && (
            <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', textAlign:'center', padding:20, fontFamily:"'IM Fell DW Pica',serif", fontStyle:'italic', color:'#795275', fontSize:20 }}>
              <p>Une erreur est survenue.</p>
              <p style={{ fontSize:14, marginTop:8, opacity:0.6 }}>{result.error}</p>
              <button onClick={() => { setScreen(3); setResult(null) }} style={{ marginTop:20, fontFamily:"'IM Fell DW Pica',serif", fontSize:16, color:'#795275', background:'none', border:'none', cursor:'pointer', textDecoration:'underline' }}>← retour</button>
            </div>
          )}
        </div>

        {import.meta.env.DEV && (
          <div style={{ position:'absolute', bottom:16, left:'50%', transform:'translateX(-50%)', display:'flex', gap:8, zIndex:9999, background:'rgba(0,0,0,0.15)', padding:'6px 10px', borderRadius:99 }}>
            {[1,2,3,4].map(n => (
              <button key={n} onClick={() => setScreen(n)} style={{ width:8, height:8, borderRadius:'50%', background:screen===n?'rgba(0,0,0,0.7)':'rgba(0,0,0,0.25)', border:'none', cursor:'pointer', padding:0 }} />
            ))}
          </div>
        )}

        <style>{`
          .dots::after { content:''; animation:dots 1.2s steps(4,end) infinite; }
          @keyframes dots { 0%{content:''} 25%{content:'.'} 50%{content:'..'} 75%{content:'...'} }
          .cat-text::first-letter {
            font-size: 3.1em;
            line-height: 0.72;
            float: left;
            padding: 0.04em 0.09em 0 0;
            font-style: italic;
          }
        `}</style>
      </div>
    </>
  )
}
