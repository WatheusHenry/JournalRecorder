import { useState, useCallback, useRef, useEffect } from 'react'
import { useWebHaptics } from 'web-haptics/react'
import { HugeiconsIcon } from "@hugeicons/react"
import { Cancel01Icon, Refresh01Icon, Delete01Icon } from "@hugeicons/core-free-icons"

const MONTHS_PT = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

function ImageViewer({ photoUrl, title, day, month, year, onClose, onRemove, onReplace, onTitleChange }) {
    const [editingTitle, setEditingTitle] = useState(title)
    const inputRef = useRef(null)
    const { trigger } = useWebHaptics({ debug: true })

    useEffect(() => {
        setEditingTitle(title)
    }, [title])

    const handleBackdropClick = useCallback((e) => {
        if (e.target === e.currentTarget) {
            trigger(20)
            onClose()
        }
    }, [onClose, trigger])

    const handleTitleBlur = useCallback(() => {
        onTitleChange(editingTitle.trim())
    }, [editingTitle, onTitleChange])

    const handleTitleKeyDown = useCallback((e) => {
        if (e.key === 'Enter') {
            e.target.blur()
        }
    }, [])

    return (
        <div className="viewer-backdrop" onClick={handleBackdropClick}>
            <div className="viewer-card" onClick={(e) => e.stopPropagation()}>
                {/* Title input above photo */}
                <div className="viewer-title-area">
                    <input
                        ref={inputRef}
                        type="text"
                        className="viewer-title-input"
                        placeholder="Adicionar um título..."
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onBlur={handleTitleBlur}
                        onKeyDown={handleTitleKeyDown}
                        maxLength={60}
                    />
                </div>

                {/* Photo */}
                <div className="viewer-photo-frame">
                    <img src={photoUrl} alt={`Foto do dia ${day}`} className="viewer-photo" />
                </div>

                {/* Info + actions below photo */}
                <div className="viewer-footer">
                    <span className="viewer-date">
                        {day} de {MONTHS_PT[month]} de {year}
                    </span>
                    <div className="viewer-actions">
                        <button className="viewer-action-btn" onClick={() => { trigger(20); onReplace(); }} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <HugeiconsIcon icon={Refresh01Icon} size={18} />
                            Trocar
                        </button>
                        <button className="viewer-action-btn viewer-action-danger" onClick={() => { trigger(20); onRemove(); }} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <HugeiconsIcon icon={Delete01Icon} size={18} />
                            Remover
                        </button>
                    </div>
                </div>

                <button className="viewer-close-btn" onClick={() => { trigger(20); onClose(); }}>
                    <HugeiconsIcon icon={Cancel01Icon} size={20} />
                </button>
            </div>
        </div>
    )
}

export default ImageViewer
