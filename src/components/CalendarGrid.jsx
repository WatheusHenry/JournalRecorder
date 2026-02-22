import { useMemo } from 'react'

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function CalendarGrid({ month, year, today, photos, getPhotoKey, getPhoto, onDayClick }) {
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
            days.push({ day: d, key: `day-${d}` })
        }

        const remaining = (numRows * 7) - days.length
        for (let i = 0; i < remaining; i++) {
            days.push({ day: null, key: `empty-end-${i}` })
        }

        return { calendarDays: days, numRows }
    }, [month, year])

    const isToday = (day) => {
        return day === today.getDate() &&
            month === today.getMonth() &&
            year === today.getFullYear()
    }

    return (
        <div className="calendar-container">
            <div className="weekday-header">
                {WEEKDAYS.map(wd => (
                    <div key={wd} className="weekday-label">{wd}</div>
                ))}
            </div>

            <div
                className="calendar-grid"
                style={{ gridTemplateRows: `repeat(${numRows}, 1fr)` }}
            >
                {calendarDays.map(({ day, key }) => {
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
                            <span className="day-number">{day}</span>
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
                                        <span className="photo-action-icon">Ver foto</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="add-photo-hint">
                                    <div className="add-icon">+</div>
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
