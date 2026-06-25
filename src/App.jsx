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
                // Accept French keys (harmonie/dynamique) and map to internal English keys
                const mapped = {
                  harmony:   parsed.harmony   ?? parsed.harmonie,
                  tension:   parsed.tension,
                  dynamic:   parsed.dynamic   ?? parsed.dynamique,
                  evolution: parsed.evolution,
                }
                const ok = ['harmony','tension','dynamic','evolution']
                  .every(k => typeof mapped[k] === 'string' && mapped[k].trim().length > 0)
                if (ok) {
                  return { content: {
                    harmony:   mapped.harmony.trim(),
                    tension:   mapped.tension.trim(),
                    dynamic:   mapped.dynamic.trim(),
                    evolution: mapped.evolution.trim(),
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
  position: 'relative',
  zIndex: 1,
}
const LABEL_STYLE = {
  position: 'absolute',
  left: 30,
  zIndex: 1,
  fontFamily: "'IM Fell DW Pica',serif",
  fontSize: 20,
  letterSpacing: '-0.04em',
  color: '#9C9AA0',
  pointerEvents: 'none',
  whiteSpace: 'nowrap',
}
// Champ en flux (centré par le parent flex) avec son halo flou propre.
const FIELD_BOX = {
  position: 'relative',
  width: 322,
  maxWidth: '100%',
  height: 55,
  display: 'flex',
  alignItems: 'center',
  paddingLeft: 30,
  cursor: 'text',
}
const BLUR_BG = {
  position: 'absolute',
  inset: 0,
  zIndex: 0,
  background: '#FFF',
  filter: 'blur(12.65px)',
  borderRadius: 100,
  pointerEvents: 'none',
}

// Bouton bleu premium — même CSS que le CTA « Commencer ».
function BlueButton({ label, onClick, style, className }) {
  return (
    <button className={className} onClick={onClick} style={{ position:'relative', width:155, height:52, background:'linear-gradient(180deg,#E3F5FE 0%,#0063E7 49.52%,#60D9FE 100%)', border:'1px solid #0052BC', borderRadius:100, cursor:'pointer', overflow:'hidden', padding:0, flexShrink:0, ...style }}>
      <div style={{ position:'absolute', left:'calc(50% - 65.5px)', top:2, width:131, height:25, background:'linear-gradient(181.02deg,#E1F0FF 12.94%,rgba(225,240,255,0.4) 56.69%,rgba(17,110,233,0.5) 92.77%)', borderRadius:100, pointerEvents:'none' }} />
      <span style={{ position:'relative', fontFamily:"'IM Fell DW Pica',serif", fontSize:24, letterSpacing:'-0.04em', color:'#fff', textShadow:'0px 1px 1.6px #0164E7', lineHeight:'52px' }}>{label}</span>
    </button>
  )
}

// ── Champ texte ───────────────────────────────────────────────────────────────
// Uncontrolled input: React ne touche jamais value sur re-render → pas de blink iOS

function FieldText({ label, onEnter, inputRef }) {
  const [hasVal, setHasVal] = useState(false)
  const localRef = useRef(null)
  const ref = inputRef || localRef
  return (
    <div style={FIELD_BOX} onClick={() => ref.current?.focus()}>
      <div style={BLUR_BG} />
      {!hasVal && <span style={LABEL_STYLE}>{label}</span>}
      <input ref={ref} type="text" enterKeyHint="next" style={INPUT_STYLE}
        onBlur={() => setHasVal(!!ref.current?.value)}
        onChange={e => setHasVal(!!e.target.value)}
        onKeyDown={e => { if (e.key==='Enter'||e.key==='Tab') { e.preventDefault(); onEnter?.() } }}
      />
    </div>
  )
}

// ── Champ ville ───────────────────────────────────────────────────────────────
// Uncontrolled input: la valeur vit dans le DOM, pick() écrit ref.current.value directement

function FieldVille({ label, onConfirm, onEnter, inputRef }) {
  const [hasVal, setHasVal] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [showDrop, setShowDrop] = useState(false)
  const timer = useRef(null)
  const abortRef = useRef(null)
  const cacheRef = useRef({})       // saisie (minuscule) → résultats déjà obtenus
  const localRef = useRef(null)
  const ref = inputRef || localRef

  // Autocomplétion via Photon (komoot) : moteur pensé pour le type-ahead, bien
  // plus rapide que la recherche Nominatim. On annule la requête précédente
  // (AbortController) et on met chaque saisie en cache → réponse instantanée si
  // l'utilisateur efface ou re-tape. Restreint aux lieux habités côté serveur.
  function showItems(items) { setSuggestions(items); setShowDrop(items.length > 0) }

  async function fetchSugg(q) {
    const query = q.trim()
    if (query.length < 2) { setSuggestions([]); setShowDrop(false); return }
    const ck = query.toLowerCase()
    if (cacheRef.current[ck]) { showItems(cacheRef.current[ck]); return }
    clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      abortRef.current?.abort()
      const ctrl = new AbortController()
      abortRef.current = ctrl
      try {
        const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&lang=fr&limit=8`
          + '&osm_tag=place:city&osm_tag=place:town&osm_tag=place:village&osm_tag=place:municipality'
        const res = await fetch(url, { signal: ctrl.signal })
        const data = await res.json()
        const seen = {}
        const items = (data.features || []).map(f => {
          const p = f.properties || {}
          const name = p.name || p.city
          const ctx  = p.country || p.state
          return name ? (ctx ? `${name}, ${ctx}` : name) : null
        }).filter(l => l && !seen[l] && (seen[l] = true))
        cacheRef.current[ck] = items
        showItems(items)
      } catch (e) { if (e.name !== 'AbortError') { setSuggestions([]); setShowDrop(false) } }
    }, 120)
  }

  function pick(s) {
    if (ref.current) ref.current.value = s
    setHasVal(!!s)
    onConfirm(s)
    setShowDrop(false)
    setSuggestions([])
  }

  return (
    <div style={{ position:'relative', width:322, maxWidth:'100%', zIndex:10 }}>
      <div style={FIELD_BOX} onClick={() => ref.current?.focus()}>
        <div style={BLUR_BG} />
        {!hasVal && <span style={LABEL_STYLE}>{label}</span>}
        <input ref={ref} type="text" autoComplete="off" enterKeyHint="next" style={INPUT_STYLE}
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

function FieldDate({ label, dateRaw, onDateChange, onEnter, inputRef }) {
  const [hasVal, setHasVal] = useState(!!dateRaw)
  const [focused, setFocused] = useState(false)
  const localRef = useRef(null)
  const ref = inputRef || localRef

  return (
    <div style={FIELD_BOX} onClick={() => ref.current?.focus()}>
      <div style={BLUR_BG} />
      {/* Au repos : nom du champ en gris. Au clic : format attendu JJ/MM/AAAA. */}
      {!hasVal && <span style={LABEL_STYLE}>{focused ? 'JJ/MM/AAAA' : label}</span>}
      <input ref={ref} type="text" inputMode="numeric" defaultValue={dateFmt(dateRaw)} enterKeyHint="next" style={INPUT_STYLE}
        onFocus={() => setFocused(true)}
        onBlur={() => { setFocused(false); setHasVal(!!ref.current?.value) }}
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

function FieldTime({ label, timeRaw, onTimeChange, onEnter, inputRef }) {
  const [hasVal, setHasVal] = useState(!!timeRaw)
  const localRef = useRef(null)
  const ref = inputRef || localRef

  return (
    <div style={FIELD_BOX} onClick={() => ref.current?.focus()}>
      <div style={BLUR_BG} />
      {!hasVal && <span style={LABEL_STYLE}>{label}</span>}
      <input ref={ref} type="text" inputMode="numeric" defaultValue={timeFmt(timeRaw)} enterKeyHint="done" style={INPUT_STYLE}
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

function FormScreen({ visible, bgStyle, deco, title, ctaColor, labels, onSubmit }) {
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
      {/* Formulaire centré horizontalement et verticalement */}
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'0 20px' }}>
        {(deco || title) && (
          <div style={{ marginBottom:24, display:'flex', alignItems:'center', justifyContent:'center', gap:10, color:ctaColor||'#000', textAlign:'center' }}>
            {deco && <span style={{ fontFamily:"'IM Fell DW Pica',serif", fontSize:20, letterSpacing:'-0.04em' }}>{deco}</span>}
            {title && <span style={{ fontFamily:"'IM Fell DW Pica',serif", fontStyle:'italic', fontSize:26, letterSpacing:'-0.04em' }}>{title}</span>}
          </div>
        )}
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:13 }}>
          <FieldText  label={labels[0]} onEnter={() => refVille.current?.focus()} inputRef={refPrenom} />
          <FieldVille label={labels[1]} onConfirm={v => setVilleOk(!!v)} onEnter={() => refDate.current?.focus()} inputRef={refVille} />
          <FieldDate  label={labels[2]} dateRaw={dateRaw} onDateChange={setDateRaw} onEnter={() => refTime.current?.focus()} inputRef={refDate} />
          <FieldTime  label={labels[3]} timeRaw={timeRaw} onTimeChange={setTimeRaw} onEnter={handleSubmit} inputRef={refTime} />
        </div>
        {error && <div style={{ width:322, maxWidth:'100%', marginTop:14, fontFamily:"'IM Fell DW Pica',serif", fontSize:14, fontStyle:'italic', color:ctaColor||'#a0485a', textAlign:'center' }}>{error}</div>}
        <div className="valider-wrap">
          <BlueButton label="valider" onClick={handleSubmit} />
        </div>
      </div>
    </div>
  )
}

// ── Résultat : expérience à onglets (specs Figma) ───────────────────────────
// Score → texte de la catégorie active → navigation entre 4 catégories.
// Pas de scroll, pas d'accordéon. Transition fondu entre catégories.
// Fond #F3F1E7, score 200px, texte 34/42, pastille 385×98 r200, disques 40px.

const PURPLE = '#795275'
const BG     = '#F3F1E7'

// Couches de reflet partagées : version couleurs vives vs chrome.
// Les dégradés de glints sont PÉRIODIQUES (les deux moitiés sont identiques,
// transparentes aux bords) → le translateX(-50%) boucle sans aucune couture.
const GLINTS_COLOR  = 'linear-gradient(90deg, transparent 0%, transparent 5%, rgba(255,255,255,0.38) 9%, rgba(255,255,255,0.10) 12%, transparent 16%, rgba(0,0,0,0.12) 25%, rgba(255,255,255,0.30) 33%, rgba(255,255,255,0.08) 36%, transparent 40%, transparent 50%, transparent 55%, rgba(255,255,255,0.38) 59%, rgba(255,255,255,0.10) 62%, transparent 66%, rgba(0,0,0,0.12) 75%, rgba(255,255,255,0.30) 83%, rgba(255,255,255,0.08) 86%, transparent 90%, transparent 100%)'
const GLINTS_CHROME = 'linear-gradient(90deg, transparent 0%, transparent 5%, rgba(255,255,255,0.70) 9%, rgba(255,255,255,0.18) 12%, transparent 16%, rgba(0,0,0,0.18) 25%, rgba(255,255,255,0.52) 33%, rgba(255,255,255,0.12) 36%, transparent 40%, transparent 50%, transparent 55%, rgba(255,255,255,0.70) 59%, rgba(255,255,255,0.18) 62%, transparent 66%, rgba(0,0,0,0.18) 75%, rgba(255,255,255,0.52) 83%, rgba(255,255,255,0.12) 86%, transparent 90%, transparent 100%)'
const SPEC_COLOR    = 'radial-gradient(circle at 32% 24%, rgba(255,255,255,0.97) 0%, rgba(255,255,255,0.5) 12%, rgba(255,255,255,0) 30%)'
const SPEC_CHROME   = 'radial-gradient(circle at 26% 17%, rgba(255,255,255,1) 0%, rgba(255,255,255,0.88) 7%, rgba(255,255,255,0) 26%)'

// Billes glossy — couleurs vives, une par catégorie. évolution = chrome.
const CATEGORIES = [
  { key:'harmony',   label:'harmonie',  // vert lime
    disc:'radial-gradient(circle at 68% 73%, rgba(150,255,80,0.35) 0%, rgba(150,255,80,0) 40%), radial-gradient(circle at 44% 44%, #88FF33 0%, #33BB00 38%, #1A8800 65%, #0A4400 100%)',
    glints:GLINTS_COLOR, spec:SPEC_COLOR },
  { key:'tension',   label:'tension',   // rose fuchsia
    disc:'radial-gradient(circle at 68% 73%, rgba(255,140,200,0.35) 0%, rgba(255,140,200,0) 40%), radial-gradient(circle at 44% 44%, #FF66CC 0%, #EE0099 38%, #AA0055 65%, #660033 100%)',
    glints:GLINTS_COLOR, spec:SPEC_COLOR },
  { key:'dynamic',   label:'dynamique', // bleu électrique
    disc:'radial-gradient(circle at 68% 73%, rgba(140,195,255,0.35) 0%, rgba(140,195,255,0) 40%), radial-gradient(circle at 44% 44%, #66AAFF 0%, #1155EE 38%, #0033BB 65%, #001166 100%)',
    glints:GLINTS_COLOR, spec:SPEC_COLOR },
  { key:'evolution', label:'évolution', // chrome bleuté
    disc:'radial-gradient(circle at 73% 77%, rgba(180,225,255,0.50) 0%, rgba(180,225,255,0) 28%), radial-gradient(circle at 52% 54%, rgba(100,165,220,0.28) 0%, rgba(100,165,220,0) 42%), radial-gradient(circle at 44% 40%, #D8EEF8 0%, #78A0B8 25%, #304858 55%, #0E1820 85%, #040810 100%)',
    glints:GLINTS_CHROME, spec:SPEC_CHROME },
]

// Bille glossy 40px + label 12px. Active : reflet principal fixe + reflets
// secondaires qui balayent la surface (= rotation) + scintillement.
function PlanetNav({ cat, active, onSelect }) {
  return (
    <button
      onClick={() => onSelect(cat.key)}
      aria-pressed={active}
      style={{
        background:'none', border:'none', padding:0, cursor:'pointer',
        display:'flex', flexDirection:'column', alignItems:'center', gap:7,
      }}
    >
      <span
        style={{
          position:'relative', width:40, height:40,
          display:'flex', alignItems:'center', justifyContent:'center',
          opacity: active ? 1 : 0.5,
          transform: active ? 'scale(1.08)' : 'scale(0.82)',
          transition:'opacity 0.4s ease, transform 0.4s cubic-bezier(0.22,1,0.36,1)',
        }}
      >
        {/* la boule (clip interne de la surface) */}
        <span style={{
          position:'relative', overflow:'hidden', width:40, height:40, borderRadius:'50%', background:cat.disc,
          boxShadow: active
            ? 'inset 0 2px 4px rgba(255,255,255,0.85), inset 0 -4px 7px rgba(0,0,0,0.4), 0 6px 16px rgba(0,0,0,0.28)'
            : 'inset 0 2px 3px rgba(255,255,255,0.5), inset 0 -3px 5px rgba(0,0,0,0.22)',
          transition:'box-shadow 0.4s ease',
        }}>
          {active && (
            <>
              {/* reflets secondaires qui balayent la surface → rotation
                  (masque fixe + dégradé périodique qui défile sous le masque) */}
              <span className="pn-glints">
                <span className="pn-glints-roll" style={{ background:cat.glints }} />
              </span>
              {/* assombrissement du limbe → volume sphérique */}
              <span style={{
                position:'absolute', inset:0, pointerEvents:'none',
                background:'radial-gradient(circle at 50% 50%, transparent 46%, rgba(0,0,0,0.34) 100%)',
              }} />
              {/* reflet principal FIXE (source de lumière fixe) */}
              <span style={{
                position:'absolute', inset:0, pointerEvents:'none', background:cat.spec,
              }} />
              {/* éclat qui scintille */}
              <span className="pn-twinkle" style={{
                position:'absolute', top:'15%', left:'21%', width:'15%', height:'11%', borderRadius:'50%', pointerEvents:'none',
                background:'radial-gradient(circle, #fff 0%, rgba(255,255,255,0) 70%)',
              }} />
            </>
          )}
        </span>
      </span>
      <span
        className="pn-label"
        style={{
          fontFamily:"'IM Fell DW Pica',serif", fontStyle:'italic',
          lineHeight:'14px', letterSpacing:'-0.04em', textAlign:'center',
          color:'#575757', whiteSpace:'nowrap',
          opacity: active ? 1 : 0.5, fontWeight: active ? 700 : 400,
          transition:'opacity 0.4s ease',
        }}
      >
        {cat.label}
      </span>
    </button>
  )
}

// ── Score animé : défile de 0 à la valeur finale (ease-out) ───────────────────
// requestAnimationFrame (pas setInterval) → fluide 60fps. Arrondi entier à
// chaque frame, valeur exacte garantie en fin. Respecte prefers-reduced-motion.
// Aucune dépendance à un positionnement fixed → sûr sur iOS Safari. Largeur
// réservée par un fantôme invisible (chiffre calé à droite) → le % ne bouge pas.
function AnimatedScore({ value, duration = 1500 }) {
  const target = Math.round(Number(value) || 0)
  const [display, setDisplay] = useState(0)
  const rafRef   = useRef(null)
  const startRef = useRef(null)

  useEffect(() => {
    const reduce = window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) { setDisplay(target); return }

    startRef.current = null
    const easeOut = (t) => 1 - Math.pow(1 - t, 3) // cubic : rapide puis ralentit

    const tick = (now) => {
      if (startRef.current == null) startRef.current = now
      const t = Math.min(1, (now - startRef.current) / duration)
      setDisplay(Math.round(target * easeOut(t)))
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
      else setDisplay(target)
    }
    rafRef.current = requestAnimationFrame(tick)

    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [target, duration])

  return (
    <span style={{ position:'relative', display:'inline-block' }}>
      <span aria-hidden="true" style={{ visibility:'hidden' }}>{target}</span>
      <span style={{ position:'absolute', right:0, top:0, whiteSpace:'nowrap' }}>{display}</span>
    </span>
  )
}

function ResultView({ result, onRestart }) {
  const [active, setActive]   = useState('harmony')
  const [shown, setShown]     = useState('harmony')
  const [visible, setVisible] = useState(true)
  const scrollRef = useRef(null)

  // Fondu : sortie → reset scroll → changement de contenu → entrée.
  useEffect(() => {
    if (active === shown) return
    setVisible(false)
    const t = setTimeout(() => {
      setShown(active)
      setVisible(true)
      if (scrollRef.current) scrollRef.current.scrollTop = 0
    }, 320)
    return () => clearTimeout(t)
  }, [active, shown])

  const text = result[shown] || ''

  return (
    <div className="result-screen" style={{ position:'absolute', inset:0, background:BG, overflow:'hidden' }}>

      {/* ── Haut : eyebrow + score (avec %) — non interactif pour ne pas bloquer le scroll ── */}
      <div style={{ position:'absolute', top:'calc(env(safe-area-inset-top) + 6vh)', left:0, right:0, display:'flex', flexDirection:'column', alignItems:'center', pointerEvents:'none', zIndex:1 }}>
        <div style={{ fontFamily:"'IM Fell DW Pica',serif", fontStyle:'italic', fontSize:24, lineHeight:'30px', letterSpacing:'-0.04em', color:PURPLE }}>
          votre compatibilité
        </div>
        <div style={{ display:'flex', justifyContent:'center', alignItems:'flex-start', marginTop:'1.2vh', fontSize:'min(200px, 24vh)', lineHeight:0.9, color:PURPLE }}>
          <span style={{ fontFamily:"'IM Fell DW Pica',serif", fontStyle:'italic', letterSpacing:'-0.04em' }}>
            <AnimatedScore value={result.score} />
          </span>
          <span style={{ fontFamily:"'IM Fell DW Pica',serif", fontStyle:'italic', fontSize:'0.2em', lineHeight:1, letterSpacing:'-0.04em', marginTop:'0.12em', marginLeft:'0.15em' }}>
            %
          </span>
        </div>
      </div>

      {/* ── Retour accueil (haut gauche) — recommence le parcours ── */}
      <button onClick={onRestart} aria-label="recommencer" className="result-home"
        style={{ position:'absolute', top:'calc(env(safe-area-inset-top) + 12px)', left:10, zIndex:5,
          background:'none', border:'none', cursor:'pointer', padding:'10px 12px',
          fontFamily:"'IM Fell DW Pica',serif", fontSize:26, lineHeight:1, letterSpacing:'-0.02em',
          color:PURPLE, opacity:0.85, WebkitTapHighlightColor:'transparent' }}>
        ⋆˚꩜｡
      </button>

      {/* ── Zone scrollable : texte de la catégorie active ── */}
      <div
        ref={scrollRef}
        style={{ position:'absolute', top:'calc(env(safe-area-inset-top) + 6vh + 255px)', bottom:0, left:0, right:0, overflowY:'auto', WebkitOverflowScrolling:'touch', overscrollBehavior:'contain' }}
      >
        <div style={{ width:'min(353px, 90vw)', margin:'0 auto', paddingBottom:'calc(env(safe-area-inset-bottom) + 170px)' }}>
          <div className="cat-text" style={{ opacity:visible?1:0, transition:'opacity 0.3s ease', display:'flex', flexDirection:'column', gap:20 }}>
            {text.split('\n\n').map((para, i) => (
              <p key={i} style={{ fontFamily:"'IM Fell DW Pica',serif", fontStyle:'normal', fontSize:24, lineHeight:1.3, letterSpacing:'-0.04em', color:PURPLE, textAlign:'left', margin:0 }}>
                {para}
              </p>
            ))}
          </div>
        </div>
      </div>

      {/* ── Bas : pastille liquid glass flottante (fixe) ── */}
      <div className="result-bottom" style={{ position:'absolute', left:0, right:0, bottom:'calc(env(safe-area-inset-bottom) + 24px)', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{
          position:'relative', width:'min(385px, 92vw)', height:98, borderRadius:200,
          background:'rgba(255,255,255,0.14)',
          backdropFilter:'blur(22px) saturate(180%)', WebkitBackdropFilter:'blur(22px) saturate(180%)',
          border:'1px solid rgba(255,255,255,0.45)',
          boxShadow:'inset 0 1px 1px rgba(255,255,255,0.7), inset 0 -10px 18px rgba(255,255,255,0.12), inset 0 0 0 0.5px rgba(255,255,255,0.2), 0 10px 30px rgba(121,82,117,0.14)',
          display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden',
        }}>
          <div style={{ position:'absolute', top:0, left:0, right:0, height:'52%', background:'linear-gradient(180deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0) 100%)', pointerEvents:'none', zIndex:0 }} />
          <div style={{ position:'relative', zIndex:1, display:'flex', flexDirection:'row', justifyContent:'center', alignItems:'flex-start', gap:45 }}>
            {CATEGORIES.map(c => (
              <PlanetNav key={c.key} cat={c} active={c.key === active} onSelect={setActive} />
            ))}
          </div>
        </div>
      </div>
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

const SCREEN_TOP    = { 1:'#ffffff', 2:'#FF589B', 3:'#78D119', 4:'#F3F1E7' }
const SCREEN_BOTTOM = { 1:'#ffffff', 2:'#FFB962', 3:'#FFF827', 4:'#F3F1E7' }

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  const [screen, setScreen] = useState(1)
  const [formKey, setFormKey] = useState(0)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const p1Ref = useRef(null)

  // ── Couleur des barres système (full-bleed) ───────────────────────────────
  // data-screen + theme-color réglés AVANT le paint pour que la barre haute du
  // navigateur (Android / iOS) prenne la couleur du fond sans flash. La barre
  // basse suit via le fond edge-to-edge (et la couleur du manifest en PWA).
  useLayoutEffect(() => {
    document.documentElement.setAttribute('data-screen', String(screen))
    let meta = document.querySelector('meta[name="theme-color"]')
    if (!meta) {
      meta = document.createElement('meta')
      meta.setAttribute('name', 'theme-color')
      document.head.appendChild(meta)
    }
    meta.setAttribute('content', SCREEN_TOP[screen])
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
          <div style={{ position:'absolute', width:242, left:'calc(50% - 121px)', top:'calc(50% - 52.5px)', fontFamily:"'IM Fell DW Pica',serif", fontStyle:'italic', fontSize:40, lineHeight:'35px', textAlign:'center', letterSpacing:'-0.04em', color:'#1E00FF', pointerEvents:'none' }}>
            Découvrez votre compatibilité astrale
          </div>
          <BlueButton label="Commencer" onClick={() => setScreen(2)} style={{ position:'absolute', left:'calc(50% - 77.5px)', top:'calc(50% + 93px)' }} />
        </div>

        {/* ── SCREEN 2 ── */}
        <FormScreen key={`s2-${formKey}`} visible={screen===2}
          bgStyle={{ background:'linear-gradient(180.02deg, #FF589B 28.82%, #FFB962 99.98%)' }}
          deco="₊˚⊹☆" title="personne 1" ctaColor="#FFFBC9"
          labels={['votre prénom','votre ville de naissance','votre date de naissance','votre heure de naissance']}
          onSubmit={data => { p1Ref.current = data; setScreen(3) }}
        />

        {/* ── SCREEN 3 ── */}
        <FormScreen key={`s3-${formKey}`} visible={screen===3}
          bgStyle={{ background:'linear-gradient(180deg, #78D119 0%, #FFF827 100%)' }}
          deco="✮ ⋆ ˚｡𖦹 ⋆｡°✩" title="personne 2" ctaColor="#000000"
          labels={['son prénom','sa ville de naissance','sa date de naissance','son heure de naissance']}
          onSubmit={data => { calculate(p1Ref.current, data) }}
        />

        {/* ── SCREEN 4 ── */}
        <div style={{ position:'absolute', inset:0, background:'#F3F1E7', overflow:'hidden', transition:'opacity 0.4s', ...visible(4) }}>
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
          /* Lettre initiale grande + italique ; reste du texte en regular */
          .cat-text::first-letter {
            font-size: 3.1em;
            line-height: 0.72;
            float: left;
            padding: 0.04em 0.09em 0 0;
            font-style: italic;
          }
          /* Labels des onglets */
          .pn-label { font-size: 12px; }
          /* Marge bouton valider */
          .valider-wrap { margin-top: 30px; }
          /* Bouton retour accueil */
          .result-home { transition: opacity 0.2s ease, transform 0.1s ease; }
          .result-home:hover { opacity: 1; }
          .result-home:active { transform: scale(0.92); }
          /* Bille active : reflets qui balayent (rotation) + scintillement.
             Masque radial FIXE (centré sur la bille) + dégradé périodique qui
             défile en dessous → boucle parfaitement continue, sans couture. */
          .pn-glints {
            position: absolute; inset: 0; pointer-events: none; overflow: hidden; border-radius: 50%;
            -webkit-mask: radial-gradient(circle at 50% 50%, #000 0%, #000 34%, transparent 74%) center / 100% 100% no-repeat;
                    mask: radial-gradient(circle at 50% 50%, #000 0%, #000 34%, transparent 74%) center / 100% 100% no-repeat;
          }
          .pn-glints-roll {
            position: absolute; top: 0; left: 0; width: 200%; height: 100%;
            animation: ballRoll 8s linear infinite;
          }
          @keyframes ballRoll { from { transform: translateX(0); } to { transform: translateX(-50%); } }
          @keyframes ballTwinkle { 0%,100% { opacity: 0.3; transform: scale(0.85); } 50% { opacity: 0.95; transform: scale(1.05); } }
          .pn-twinkle { animation: ballTwinkle 2.8s ease-in-out infinite; }
          @media (prefers-reduced-motion: reduce) {
            .pn-glints-roll, .pn-twinkle { animation: none; }
          }
          /* Desktop */
          @media (min-width: 900px) {
            .result-bottom { bottom: 44px !important; }
            .cat-text { font-size: 24px !important; line-height: 1.4 !important; }
            .pn-label { font-size: 14px; }
            .valider-wrap { margin-top: 40px; }
          }
        `}</style>
      </div>
    </>
  )
}
