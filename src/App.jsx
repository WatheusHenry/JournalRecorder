import { useState, useCallback, useEffect, useRef } from 'react'
import { useWebHaptics } from 'web-haptics/react'
import './App.css'
import CalendarGrid from './components/CalendarGrid'
import PhotoModal from './components/PhotoModal'
import ImageViewer from './components/ImageViewer'
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowLeft01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons"

const MONTHS_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

const STORAGE_KEY = 'journal-photos'
const TITLES_KEY = 'journal-titles'

function loadData(key) {
  try {
    const data = localStorage.getItem(key)
    return data ? JSON.parse(data) : {}
  } catch {
    return {}
  }
}

// Normalize old string format to new { url, crop, originalUrl } format
function normalizePhoto(data) {
  if (typeof data === 'string') {
    return { url: data, crop: { x: 50, y: 50 }, originalUrl: data }
  }
  return { ...data, originalUrl: data.originalUrl || data.url }
}

function App() {
  const today = new Date()
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [photos, setPhotos] = useState(() => loadData(STORAGE_KEY))
  const [titles, setTitles] = useState(() => loadData(TITLES_KEY))
  const [selectedDay, setSelectedDay] = useState(null)
  const [viewingPhoto, setViewingPhoto] = useState(null)
  const [pendingFile, setPendingFile] = useState(null)
  const fileInputRef = useRef(null)
  const { trigger } = useWebHaptics({ debug: true })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(photos))
  }, [photos])

  useEffect(() => {
    localStorage.setItem(TITLES_KEY, JSON.stringify(titles))
  }, [titles])

  const goToPrevMonth = () => {
    trigger(30)
    setCurrentMonth(prev => {
      if (prev === 0) {
        setCurrentYear(y => y - 1)
        return 11
      }
      return prev - 1
    })
  }

  const goToNextMonth = () => {
    trigger(30)
    setCurrentMonth(prev => {
      if (prev === 11) {
        setCurrentYear(y => y + 1)
        return 0
      }
      return prev + 1
    })
  }

  const goToToday = () => {
    trigger(30)
    setCurrentMonth(today.getMonth())
    setCurrentYear(today.getFullYear())
  }

  const getPhotoKey = (year, month, day) => `${year}-${month}-${day}`

  const getPhoto = useCallback((key) => {
    const data = photos[key]
    return data ? normalizePhoto(data) : null
  }, [photos])

  const handleDayClick = (day) => {
    trigger(20)
    const key = getPhotoKey(currentYear, currentMonth, day)
    if (photos[key]) {
      setViewingPhoto({ key, day })
    } else {
      setSelectedDay(day)
      fileInputRef.current?.click()
    }
  }

  const handleGlobalFileChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setPendingFile(file)
    } else {
      setSelectedDay(null)
    }
    e.target.value = ''
  }

  const handlePhotoAdd = (day, photoDataUrl, crop, originalUrl) => {
    const key = getPhotoKey(currentYear, currentMonth, day)
    setPhotos(prev => ({ ...prev, [key]: { url: photoDataUrl, crop, originalUrl: originalUrl || photoDataUrl } }))
    setSelectedDay(null)
    setPendingFile(null)
  }

  const handlePhotoRemove = (key) => {
    setPhotos(prev => {
      const next = { ...prev }
      delete next[key]
      return next
    })
    setTitles(prev => {
      const next = { ...prev }
      delete next[key]
      return next
    })
    setViewingPhoto(null)
  }

  const handleTitleChange = (key, title) => {
    setTitles(prev => ({ ...prev, [key]: title }))
  }

  const handlePhotoReplace = () => {
    if (viewingPhoto) {
      setSelectedDay(viewingPhoto.day)
      setViewingPhoto(null)
    }
  }

  const isCurrentMonth = currentMonth === today.getMonth() && currentYear === today.getFullYear()

  return (
    <div className="app">
      <div className="notebook">
        {/* Background Pages */}
        <div className="notebook-page left-page"></div>

        {/* Center Spine */}
        <div className="notebook-spine">
          <div className="bookmark-ribbon"></div>
        </div>

        <div className="notebook-page right-page"></div>

        {/* Spanning Content Overlay */}
        <div className="notebook-content">
          <header className="calendar-header">
            <div className="header-left">
              <div className="header-title">
                <h1>Journal</h1>
                <p>Seu diário visual em fotos</p>
              </div>
            </div>

            <div className="header-nav">
              <button className="nav-btn" onClick={goToPrevMonth} title="Mês anterior">
                <HugeiconsIcon icon={ArrowLeft01Icon} size={24} />
              </button>
              <div className="month-year-group">
                <span className="month-year-display">
                  {MONTHS_PT[currentMonth]} {currentYear}
                </span>
              </div>
              <button className="nav-btn" onClick={goToNextMonth} title="Próximo mês">
                <HugeiconsIcon icon={ArrowRight01Icon} size={24} />
              </button>
            </div>

            <div className="header-right">
              <button
                className={`today-btn ${!isCurrentMonth ? 'visible' : ''}`}
                onClick={goToToday}
                disabled={isCurrentMonth}
              >
                Hoje
              </button>
            </div>
          </header>

          <CalendarGrid
            month={currentMonth}
            year={currentYear}
            today={today}
            getPhotoKey={getPhotoKey}
            getPhoto={getPhoto}
            onDayClick={handleDayClick}
            onGoToToday={goToToday}
          />
        </div>
      </div>
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept="image/*"
        onChange={handleGlobalFileChange}
      />

      {
        selectedDay !== null && pendingFile !== null && (
          <PhotoModal
            day={selectedDay}
            initialFile={pendingFile}
            onClose={() => { setSelectedDay(null); setPendingFile(null); }}
            onPhotoAdd={handlePhotoAdd}
            onRequestReselect={() => fileInputRef.current?.click()}
          />
        )
      }

      {
        viewingPhoto && (
          <ImageViewer
            photoUrl={getPhoto(viewingPhoto.key)?.originalUrl || getPhoto(viewingPhoto.key)?.url}
            title={titles[viewingPhoto.key] || ''}
            day={viewingPhoto.day}
            month={currentMonth}
            year={currentYear}
            onClose={() => setViewingPhoto(null)}
            onRemove={() => handlePhotoRemove(viewingPhoto.key)}
            onReplace={handlePhotoReplace}
            onTitleChange={(title) => handleTitleChange(viewingPhoto.key, title)}
          />
        )
      }
    </div >
  )
}

export default App
