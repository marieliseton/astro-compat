import { useState, useRef } from 'react'
import { calculateScore, buildAstroSummary } from './astrology.js'
import bg1 from './assets/bg1.png'
import bg2 from './assets/bg2.png'

const RAPIDAPI_KEY = import.meta.env.VITE_RAPIDAPI_KEY || ''
const GEMINI_KEY = import.meta.env.VITE_GEMINI_KEY || ''

const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash']

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function fallbackInterpretation(score, p1Name, p2Name) {
  if (score >= 75) {
    return `${p1Name} et ${p2Name} avancent au même rythme sans avoir à se forcer : les idées de l'un trouvent un écho chez l'autre, et les silences ne pèsent jamais. Peu de friction, beaucoup de fluidité. Un lien qui demande peu d'efforts pour tenir.`
  }
  if (score >= 55) {
    return `${p1Name} lance, ${p2Name} tempère — et c'est souvent là que ça marche : l'un ose, l'autre stabilise. Quelques accrochages sur le rythme et les non-dits sont à prévoir. Si chacun écoute la cadence de l'autre, le lien tient.`
  }
  if (score >= 40) {
    return `${p1Name} et ${p2Name} ne fonctionnent pas pareil : ce qui motive l'un peut lasser l'autre. Le terrain commun existe mais se construit. Il faudra de la patience et des vrais échanges plutôt que des suppositions.`
  }
  return `${p1Name} et ${p2Name} avancent sur des chemins différents, avec des rythmes et des priorités qui se croisent peu. Le lien est possible, mais il demande des efforts constants et beaucoup de clarté pour ne pas s'épuiser.`
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

async function geocodeCity(cityInput) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cityInput)}&format=json&limit=1&addressdetails=1`
  const res = await fetch(url, { headers: { 'Accept-Language': 'fr' } })
  const data = await res.json()
  if (!data.length) throw new Error(`Ville introuvable : ${cityInput}`)
  const p = data[0]
  return {
    lat: parseFloat(p.lat),
    lng: parseFloat(p.lon),
    city: p.address.city || p.address.town || p.address.village || cityInput.split(',')[0],
    country: p.address.country_code?.toUpperCase() || 'FR',
    tz: 'Europe/Paris',
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
function FieldVille({ top, label, value, onChange, onEnter, inputRef }) {
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
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&addressdetails=1`, { headers: { 'Accept-Language':'fr' } })
        const data = await res.json()
        const seen = {}
        const items = data.map(p => {
          const city = p.address.city||p.address.town||p.address.village||p.display_name.split(',')[0].trim()
          const country = p.address.country||''
          return city+(country?', '+country:'')
        }).filter(l => { if(seen[l]) return false; seen[l]=1; return true })
        setSuggestions(items)
        setShowDrop(items.length > 0)
      } catch { setSuggestions([]); setShowDrop(false) }
    }, 400)
  }

  function pick(s) {
    onChange(s)
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
              if (showDrop && suggestions.length > 0) pick(suggestions[0])
              else onEnter?.()
            } else if (e.key === 'Tab') {
              e.preventDefault()
              if (showDrop && suggestions.length > 0) pick(suggestions[0])
              onEnter?.()
            }
          }}
          onChange={e => { onChange(e.target.value); fetchSugg(e.target.value) }} />
      </div>
      {showDrop && (
        <div style={{ position:'absolute', top:55, left:0, width:'100%', background:'rgba(255,255,255,0.95)', backdropFilter:'blur(20px)', borderRadius:10, boxShadow:'0 4px 20px rgba(0,0,0,0.12)', overflow:'hidden', zIndex:100 }}>
          {suggestions.map((s,i) => (
            <div key={i} onMouseDown={() => pick(s)}
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
        onChange={e => { const d=e.target.value.replace(/\D/g,'').slice(0,8); onDateChange(d) }}
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
        onChange={e => { const d=e.target.value.replace(/\D/g,'').slice(0,4); onTimeChange(d) }}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); onEnter?.() } }}
        onBlur={() => setActive(false)} />
    </div>
  )
}

// ── Écran formulaire ──
function FormScreen({ visible, bgStyle, deco, labels, data, onChange, onSubmit, error }) {
  const refVille = useRef(null)
  const refDate = useRef(null)
  const refTime = useRef(null)

  return (
    <div style={{ width:'100%', height:'100%', position:'absolute', top:0, left:0, overflow:'hidden', background:'#FBF2DB',
      transition:'opacity 0.4s ease, transform 0.4s ease',
      opacity: visible ? 1 : 0, pointerEvents: visible ? 'all' : 'none',
      transform: visible ? 'translateX(0)' : 'translateX(30px)' }}>

      <div style={{ position:'absolute', top:0, left:0, width:'100%', height:'100%', backgroundSize:'cover', backgroundPosition:'center', ...bgStyle }} />

      {deco && <div style={{ position:'absolute', left:'50%', transform:'translateX(-50%)', top:62, fontFamily:"'IM Fell DW Pica',serif", fontSize:20, letterSpacing:'-0.04em', color:'#000', textAlign:'center' }}>{deco}</div>}

      {[126,194,262,330].map(t => (
        <div key={t} style={{ position:'absolute', width:322, height:55, left:'calc(50% - 161px)', top:t, background:'#FFF', filter:'blur(12.65px)', borderRadius:100 }} />
      ))}

      <FieldText  top={126} label={labels[0]} value={data.prenom}  onChange={v => onChange('prenom', v)} onEnter={() => refVille.current?.focus()} />
      <FieldVille top={194} label={labels[1]} value={data.ville}   onChange={v => onChange('ville', v)}  onEnter={() => refDate.current?.focus()}  inputRef={refVille} />
      <FieldDate  top={262} label={labels[2]} dateRaw={data.dateRaw} onDateChange={v => onChange('dateRaw', v)} onEnter={() => refTime.current?.focus()} inputRef={refDate} />
      <FieldTime  top={330} label={labels[3]} timeRaw={data.timeRaw} onTimeChange={v => onChange('timeRaw', v)} onEnter={onSubmit} inputRef={refTime} />

      {error && (
        <div style={{ position:'absolute', left:'calc(50% - 161px)', width:322, top:405, fontFamily:"'IM Fell DW Pica',serif", fontSize:14, fontStyle:'italic', color:'#a0485a', textAlign:'center' }}>{error}</div>
      )}

      <button onClick={onSubmit} style={{ position:'absolute', left:'calc(50% - 74px)', top:'75%', width:148, fontFamily:"'IM Fell DW Pica',serif", fontSize:20, letterSpacing:'-0.04em', color:'#000', background:'none', border:'none', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
        valider
        <span style={{ display:'block', width:50, height:1, background:'#000' }} />
      </button>
    </div>
  )
}

// ── App principale ──
export default function App() {
  const [screen, setScreen] = useState(1)
  const [formKey, setFormKey] = useState(0)
  const [p1, setP1] = useState({ prenom:'', ville:'', dateRaw:'', timeRaw:'' })
  const [p2, setP2] = useState({ prenom:'', ville:'', dateRaw:'', timeRaw:'' })
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error1, setError1] = useState('')
  const [error2, setError2] = useState('')

  function updateP1(k,v) { setP1(p => ({...p, [k]:v})) }
  function updateP2(k,v) { setP2(p => ({...p, [k]:v})) }

  function validateP1() {
    if (!p1.prenom.trim()) { setError1('Merci de renseigner votre prénom.'); return false }
    if (!p1.ville.trim())  { setError1('Merci de renseigner votre ville.'); return false }
    if (p1.dateRaw.length < 8) { setError1('Date incomplète (JJ/MM/AAAA).'); return false }
    if (p1.timeRaw.length < 4) { setError1('Heure incomplète (hhmm).'); return false }
    setError1(''); return true
  }

  function validateP2() {
    if (!p2.prenom.trim()) { setError2('Merci de renseigner son prénom.'); return false }
    if (!p2.ville.trim())  { setError2('Merci de renseigner sa ville.'); return false }
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

      const score = calculateScore(aspectsArr)
      const astroSummary = buildAstroSummary(
        { aspects: aspectsArr, first_subject: synData?.first_subject || synData?.chart_data?.first_subject, second_subject: synData?.second_subject || synData?.chart_data?.second_subject },
        p1.prenom, p2.prenom
      )

      const prompt = `Tu analyses la compatibilité GÉNÉRALE entre deux personnes (pas amoureuse : leur façon de fonctionner ensemble au quotidien, en amitié, au travail, dans la vie).

Voici leurs données :
${astroSummary}

Score : ${score}/100

Écris un texte TRÈS COURT (3 à 4 phrases maximum). Règles strictes :
- Utilise les prénoms : ${p1.prenom} et ${p2.prenom}.
- Décris CONCRÈTEMENT leur dynamique : qui fait quoi, comment ils se complètent ou s'opposent dans la vraie vie.
- Nomme le point de friction réel, puis la condition pour que le lien fonctionne.
- Ton poétique, élégant et beau, mais SOBRE — pas de blabla, chaque phrase doit être utile et applicable.
- N'utilise JAMAIS de vocabulaire astrologique (pas de "Soleil", "Lune", "aspect", "trigone", "signe", etc.). Traduis tout en traits de caractère et comportements concrets.
- Cohérent avec le score de ${score}%.
- Pas de titre, pas d'emoji. Réponds uniquement avec le texte.

Exemple du ton voulu : "marie avance vite, koko prend son temps — et c'est justement là que ça marche : l'une lance les idées, l'autre les pose. Attendez-vous à des élans freinés et des silences mal lus. Le vrai test sera la patience : si chacun respecte le rythme de l'autre, ce lien tient. Sinon il s'épuise."`
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
    setFormKey(k => k + 1)
  }

  const visible = (n) => ({
    opacity: screen===n ? 1 : 0,
    pointerEvents: screen===n ? 'all' : 'none',
    transform: screen===n ? 'translateX(0)' : 'translateX(30px)',
  })

  return (
    <div style={{ width:'100vw', height:'100dvh', minHeight:'100dvh', position:'relative', overflow:'hidden', background:'#FBF2DB' }}>

      {/* ── SCREEN 1 ── */}
      <div style={{ width:'100%', height:'100%', position:'absolute', top:0, left:0, background:'#FBF2DB', overflow:'hidden', transition:'opacity 0.4s, transform 0.4s', ...visible(1) }}>
        <div style={{ position:'absolute', top:0, left:0, width:'100%', height:'100%', backgroundImage:`url(${bg1})`, backgroundSize:'cover', backgroundPosition:'center' }} />
        <div style={{ position:'absolute', width:242, left:'calc(50% - 121px)', top:'38%', fontFamily:"'IM Fell DW Pica',serif", fontStyle:'italic', fontSize:40, lineHeight:'35px', textAlign:'center', letterSpacing:'-0.04em', color:'#565454' }}>
          Découvrez votre compatibilité astral
        </div>
        <button onClick={() => setScreen(2)} style={{ position:'absolute', left:'calc(50% - 74px)', top:'75%', width:148, fontFamily:"'IM Fell DW Pica',serif", fontSize:20, letterSpacing:'-0.04em', color:'#000', background:'none', border:'none', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
          commencer
          <span style={{ display:'block', width:82, height:1, background:'#000' }} />
        </button>
      </div>

      {/* ── SCREEN 2 ── */}
      <FormScreen
        key={`s2-${formKey}`}
        visible={screen===2}
        bgStyle={{ backgroundImage:`url(${bg2})`, background:`linear-gradient(0deg, rgba(255,225,249,0.2), rgba(255,225,249,0.2)) url(${bg2})` }}
        deco="₊˚⊹☆"
        labels={['votre prénom','votre ville de naissance','votre date de naissance','votre heure de naissance']}
        data={p1} onChange={updateP1} error={error1}
        onSubmit={() => { if(validateP1()) setScreen(3) }}
      />

      {/* ── SCREEN 3 ── */}
      <FormScreen
        key={`s3-${formKey}`}
        visible={screen===3}
        bgStyle={{ background:`linear-gradient(0deg, #FFFEEE, #FFFEEE) url(${bg2})`, backgroundSize:'cover' }}
        deco="✮ ⋆ ˚｡𖦹 ⋆｡°✩"
        labels={['son prénom','sa ville de naissance','sa date de naissance','son heure de naissance']}
        data={p2} onChange={updateP2} error={error2}
        onSubmit={() => { if(validateP2()) calculate() }}
      />

      {/* ── SCREEN 4 ── */}
      <div style={{ width:'100%', height:'100%', position:'absolute', top:0, left:0, background:'#FBF2DB', overflow:'hidden', transition:'opacity 0.4s, transform 0.4s', ...visible(4) }}>
        <div style={{ position:'absolute', top:0, left:0, width:'100%', height:'100%', background:'linear-gradient(0deg, #FFFEEE, #FFFEEE)' }} />

        {loading && (
          <div style={{ position:'absolute', top:0, left:0, width:'100%', height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:16 }}>
            <div style={{ fontSize:32, color:'#795275', animation:'spin 3s linear infinite' }}>✦</div>
            <p style={{ fontFamily:"'IM Fell DW Pica',serif", fontStyle:'italic', fontSize:24, color:'#795275', letterSpacing:'-0.04em' }}>les astres lisent vos destins…</p>
          </div>
        )}

        {!loading && result && !result.error && (
          <div style={{ position:'absolute', top:0, left:0, width:'100%', height:'100%', overflowY:'auto', WebkitOverflowScrolling:'touch' }}>
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

      <style>{`@keyframes spin { from { transform:rotate(0deg) } to { transform:rotate(360deg) } }`}</style>
    </div>
  )
}
