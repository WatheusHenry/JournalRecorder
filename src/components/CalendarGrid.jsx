import { useMemo, useEffect, useRef, useState } from 'react'
import { useWebHaptics } from 'web-haptics/react'
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowLeft01Icon, ArrowRight01Icon, Add01Icon, ViewIcon } from "@hugeicons/core-free-icons"

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function CalendarGrid({ month, year, today, getPhotoKey, getPhoto, onDayClick, onGoToToday }) {
    const gridRef = useRef(null)
    const [showMobileTodayBtn, setShowMobileTodayBtn] = useState(false)
    const { trigger } = useWebHaptics({ debug: true })

    const { calendarDays, numRows } = useMemo(() => {
        const firstDay = new Date(year, month, 1).getDay()
        const daysInMonth = new Date(year, month + 1, 0).getDate()
        const totalCells = firstDay + daysInMonth
        const numRows = Math.ceil(totalCells / 7)

        const days = []

        for (let i = 0; i < firstDay; i++) {
            days.push({ day: null, key: `empty-${i}` })
        }

        for (let d = 1; d <= daysInMonth; d++) {
            const wd = WEEKDAYS[(firstDay + d - 1) % 7]
            days.push({ day: d, key: `day-${d}`, weekday: wd })
        }

        const remaining = (numRows * 7) - days.length
        for (let i = 0; i < remaining; i++) {
            days.push({ day: null, key: `empty-end-${i}` })
        }

        return { calendarDays: days, numRows }
    }, [month, year])

    useEffect(() => {
        // Auto-scroll to today on mobile (showing 1 day at a time)
        if (window.innerWidth <= 768 && gridRef.current) {
            const todayCell = gridRef.current.querySelector('.day-cell.today')
            if (todayCell) {
                // slight delay to ensure render layout is complete
                setTimeout(() => {
                    todayCell.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'center' })
                }, 50)
            } else {
                // If not current month, scroll to the first day 
                const firstDayCell = gridRef.current.querySelector('.day-cell:not(.empty)')
                if (firstDayCell) {
                    setTimeout(() => {
                        firstDayCell.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'center' })
                    }, 50)
                }
            }
        }
    }, [month, year])

    const isToday = (day) => {
        return day === today.getDate() &&
            month === today.getMonth() &&
            year === today.getFullYear()
    }

    // Observe today cell to show/hide the "Hoje" button
    useEffect(() => {
        if (window.innerWidth > 768) {
            setTimeout(() => setShowMobileTodayBtn(false), 0)
            return
        }

        const isCurrentMonth = month === today.getMonth() && year === today.getFullYear()
        if (!isCurrentMonth) {
            setTimeout(() => setShowMobileTodayBtn(true), 0)
            return
        }

        const gridElement = gridRef.current
        if (!gridElement) return

        const todayCell = gridElement.querySelector('.day-cell.today')
        if (!todayCell) {
            setTimeout(() => setShowMobileTodayBtn(true), 0)
            return
        }

        const observer = new IntersectionObserver((entries) => {
            const entry = entries[0]
            setShowMobileTodayBtn(!entry.isIntersecting)
        }, { root: gridElement, rootMargin: "0px", threshold: 0.5 })

        observer.observe(todayCell)

        return () => observer.disconnect()
    }, [month, year, today])

    const scrollPrevDay = () => {
        trigger(30)
        if (gridRef.current) {
            // Get card width including gap: calc(100vw - 32px) + 16px roughly = 100vw - 16px, or just use grid width
            const scrollAmount = gridRef.current.clientWidth;
            gridRef.current.scrollBy({ left: -scrollAmount, behavior: 'smooth' })
        }
    }

    const scrollNextDay = () => {
        trigger(30)
        if (gridRef.current) {
            const scrollAmount = gridRef.current.clientWidth;
            gridRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' })
        }
    }

    const handleGoToTodayCb = () => {
        trigger(30)
        if (onGoToToday) onGoToToday()
        // Wait a tick for the DOM to update to current month if changed
        setTimeout(() => {
            if (gridRef.current) {
                const todayCell = gridRef.current.querySelector('.day-cell.today')
                if (todayCell) {
                    todayCell.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
                }
            }
        }, 50)
    }

    return (
        <div className="calendar-container">
            <div className="mobile-day-nav">
                <button className="nav-btn" onClick={scrollPrevDay} title="Dia anterior">
                    <HugeiconsIcon icon={ArrowLeft01Icon} size={24} />
                </button>
                {showMobileTodayBtn ? (
                    <button className="mobile-today-btn" onClick={handleGoToTodayCb}>Ir para Hoje</button>
                ) : (
                    <span className="mobile-day-label">Ver fotos por dia</span>
                )}
                <button className="nav-btn" onClick={scrollNextDay} title="Próximo dia">
                    <HugeiconsIcon icon={ArrowRight01Icon} size={24} />
                </button>
            </div>

            <div className="weekday-header">
                {WEEKDAYS.map(wd => (
                    <div key={wd} className="weekday-label">{wd}</div>
                ))}
            </div>

            <div
                ref={gridRef}
                className="calendar-grid"
                style={{ gridTemplateRows: `repeat(${numRows}, 1fr)` }}
            >
                {calendarDays.map(({ day, key, weekday }) => {
                    if (day === null) {
                        return <div key={key} className="day-cell empty" />
                    }

                    const photoKey = getPhotoKey(year, month, day)
                    const photo = getPhoto(photoKey)
                    const todayClass = isToday(day) ? ' today' : ''
                    const photoClass = photo ? ' has-photo' : ''

                    return (
                        <div
                            key={key}
                            className={`day-cell${todayClass}${photoClass}`}
                            onClick={() => onDayClick(day)}
                            title={`${day}/${month + 1}/${year}`}
                        >
                            <div className="day-header">
                                <span className="day-number">{day}</span>
                                <span className="mobile-weekday">{weekday}</span>
                            </div>
                            {photo ? (
                                <div className="stamp-container">
                                    <div className="stamp-inner">
                                        <img
                                            src={photo.url}
                                            alt={`Foto do dia ${day}`}
                                            className="stamp-photo"
                                            style={{
                                                objectPosition: `${photo.crop.x}% ${photo.crop.y}%`
                                            }}
                                            loading="lazy"
                                        />
                                    </div>
                                    <div className="photo-overlay">
                                        <div className="photo-action-icon" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <HugeiconsIcon icon={ViewIcon} size={14} />
                                            <span>Ver foto</span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                        <div className="add-photo-hint">
                                            <div className="add-icon">
                                                <HugeiconsIcon icon={Add01Icon} size={28} />
                                            </div>
                                        </div>
                                    )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

export default CalendarGrid
