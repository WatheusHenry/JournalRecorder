import { useState, useRef, useCallback, useEffect } from 'react'

// Synthesizes a mechanical click/thud of a hole puncher directly in the browser
const playPunchSound = () => {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext
        if (!AudioContext) return

        const ctx = new AudioContext()
        const t = ctx.currentTime

        // Thump component (low frequency impact)
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(100, t)
        osc.frequency.exponentialRampToValueAtTime(30, t + 0.1)

        gain.gain.setValueAtTime(0.2, t)
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1)

        osc.connect(gain)
        gain.connect(ctx.destination)

        osc.start(t)
        osc.stop(t + 0.1)

        // Snappy mechanical cut (highpass noise burst)
        const bufferSize = ctx.sampleRate * 0.04 // 40ms of noise
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
        const data = buffer.getChannelData(0)
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1
        }

        const noiseSource = ctx.createBufferSource()
        noiseSource.buffer = buffer

        const noiseFilter = ctx.createBiquadFilter()
        noiseFilter.type = 'bandpass'
        noiseFilter.frequency.value = 4000 // Sharp metallic/paper snap frequency

        const noiseGain = ctx.createGain()
        noiseGain.gain.setValueAtTime(0.3, t)
        noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.04)

        noiseSource.connect(noiseFilter)
        noiseFilter.connect(noiseGain)
        noiseGain.connect(ctx.destination)

        noiseSource.start(t)
    } catch (err) {
        console.error('Audio synthesizer failed:', err)
    }
}

function PhotoModal({ day, month, year, initialFile, onClose, onPhotoAdd, onRequestReselect }) {
    const [preview, setPreview] = useState(null)
    const [isPunching, setIsPunching] = useState(false)
    const [isPressing, setIsPressing] = useState(false)
    const [zoom, setZoom] = useState(1)
    const cursorRef = useRef(null)
    const imageRef = useRef(null)

    const processFile = useCallback((file) => {
        if (!file || !file.type.startsWith('image/')) return

        const reader = new FileReader()
        reader.onload = (e) => {
            const img = new Image()
            img.onload = () => {
                const canvas = document.createElement('canvas')
                const MAX_SIZE = 1200 // Higher resolution for fullscreen
                let { width, height } = img

                if (width > height) {
                    if (width > MAX_SIZE) {
                        height = (height * MAX_SIZE) / width
                        width = MAX_SIZE
                    }
                } else {
                    if (height > MAX_SIZE) {
                        width = (width * MAX_SIZE) / height
                        height = MAX_SIZE
                    }
                }

                canvas.width = width
                canvas.height = height
                const ctx = canvas.getContext('2d')
                ctx.drawImage(img, 0, 0, width, height)
                const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
                setPreview(dataUrl)
            }
            img.src = e.target.result
        }
        reader.readAsDataURL(file)
    }, [])

    useEffect(() => {
        if (initialFile) {
            processFile(initialFile)
        }
    }, [initialFile, processFile])

    const handleMouseMove = useCallback((e) => {
        if (cursorRef.current && !isPunching) {
            cursorRef.current.style.left = `${e.clientX}px`
            cursorRef.current.style.top = `${e.clientY}px`
            cursorRef.current.style.opacity = 1
        }
    }, [isPunching])

    const handleWheel = useCallback((e) => {
        if (isPunching) return
        const zoomSensitivity = 0.001
        const delta = e.deltaY * -zoomSensitivity
        setZoom(z => Math.max(0.3, Math.min(z + delta, 5)))
    }, [isPunching])

    const handleTouchMove = useCallback((e) => {
        if (cursorRef.current && !isPunching && e.touches.length > 0) {
            const touch = e.touches[0]
            cursorRef.current.style.left = `${touch.clientX}px`
            cursorRef.current.style.top = `${touch.clientY}px`
            cursorRef.current.style.opacity = 1
        }
    }, [isPunching])

    const handleWorkspaceDown = useCallback((e) => {
        if (!imageRef.current || isPunching || !preview) return
        if (e.type === 'mousedown' && e.button !== 0) return

        // Play mechanic synthesizer when tool presses on paper
        playPunchSound()

        setIsPressing(true)
    }, [isPunching, preview])

    const handleWorkspaceUp = useCallback((e) => {
        if (!isPressing || !imageRef.current || isPunching || !preview) {
            setIsPressing(false)
            return
        }

        setIsPressing(false)
        setIsPunching(true)

        let clientX = e.clientX
        let clientY = e.clientY

        if (e.changedTouches && e.changedTouches.length > 0) {
            clientX = e.changedTouches[0].clientX
            clientY = e.changedTouches[0].clientY
        }

        const imgEl = imageRef.current
        const imgRect = imgEl.getBoundingClientRect()

        // Puncher Tool dimensions used in CSS
        const toolWidth = 280
        const toolHeight = 488

        // Hole sizes based on precise PNG transparent area analysis
        const holeW = toolWidth * 0.3642
        const holeH = toolHeight * 0.2277

        // Since the cursor is accurately aligned to the center of the hole
        const cropScreenLeft = clientX - (holeW / 2)
        const cropScreenTop = clientY - (holeH / 2)

        // Map screen coordinates to the actual image element's natural pixel size
        const scaleX = imgEl.naturalWidth / imgRect.width
        const scaleY = imgEl.naturalHeight / imgRect.height

        const srcX = (cropScreenLeft - imgRect.left) * scaleX
        const srcY = (cropScreenTop - imgRect.top) * scaleY
        const srcW = holeW * scaleX
        const srcH = holeH * scaleY

        const canvas = document.createElement('canvas')
        canvas.width = srcW
        canvas.height = srcH
        const ctx = canvas.getContext('2d')

        // Ensure clean background if cropped out of bounds
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, srcW, srcH)

        ctx.drawImage(imgEl, srcX, srcY, srcW, srcH, 0, 0, srcW, srcH)

        const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.9)

        // Play finish animation, then save the perfectly cropped selo
        setTimeout(() => {
            onPhotoAdd(day, croppedDataUrl, { x: 50, y: 50 }, preview)
        }, 250)
    }, [isPressing, isPunching, day, preview, onPhotoAdd])

    return (
        <div
            className="puncher-workspace"
            onMouseMove={handleMouseMove}
            onTouchMove={handleTouchMove}
            onMouseDown={handleWorkspaceDown}
            onMouseUp={handleWorkspaceUp}
            onTouchStart={handleWorkspaceDown}
            onTouchEnd={handleWorkspaceUp}
            onWheel={handleWheel}
        >
            <style>{`
                .puncher-workspace {
                    position: fixed;
                    inset: 0;
                    z-index: 9999;
                    background: rgba(20, 20, 20, 0.95);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    overflow: hidden;
                    cursor: crosshair;
                }
                .punchTargetImg {
                    max-width: 85vw;
                    max-height: 85vh;
                    object-fit: contain;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.5);
                    border-radius: 8px;
                    pointer-events: none;
                }
                .puncher-tool {
                    position: fixed;
                    width: 280px;
                    height: 488px; /* 280 * (527/302) = 488 */
                    pointer-events: none;
                    /* Center hole of cortador is at ~49.67% left, ~29.03% top */
                    transform: translate(-49.67%, -29.03%) scale(1);
                    z-index: 10000;
                    opacity: 0;
                    /* Use will-change to optimize custom cursor rendering */
                    will-change: left, top, transform;
                    transition: transform 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275), filter 0.15s ease;
                }
                .puncher-tool.pressing {
                    transform: translate(-49.67%, -29.03%) scale(0.96);
                    filter: brightness(0.95);
                }
                .puncher-tool.punching {
                    animation: punch-finish 0.25s ease-out forwards;
                }
                @keyframes punch-finish {
                    0% { transform: translate(-49.67%, -29.03%) scale(0.96); filter: brightness(0.95); opacity: 1; }
                    100% { transform: translate(-49.67%, -29.03%) scale(1.02); filter: brightness(1.05); opacity: 0; }
                }
                .puncher-top-nav {
                    position: absolute;
                    top: 24px;
                    left: 0; right: 0;
                    display: flex;
                    justify-content: center;
                    gap: 16px;
                    z-index: 10001;
                }
                .puncher-btn {
                    background: rgba(255,255,255,0.1);
                    color: white;
                    border: 1px solid rgba(255,255,255,0.2);
                    padding: 8px 16px;
                    border-radius: 20px;
                    cursor: pointer;
                    font-family: inherit;
                    font-size: 0.9rem;
                    transition: all 0.2s;
                }
                .puncher-btn:hover {
                    background: rgba(255,255,255,0.25);
                }
                .workspace-hint {
                    position: absolute;
                    bottom: 30px;
                    color: rgba(255,255,255,0.5);
                    font-family: inherit;
                    font-size: 1rem;
                    pointer-events: none;
                    text-align: center;
                }
            `}</style>

            {!preview ? (
                <div style={{ color: 'white', fontFamily: 'inherit' }}>Processando imagem...</div>
            ) : (
                <>
                    <div className="puncher-top-nav" onClick={e => e.stopPropagation()}>
                        <button className="puncher-btn" onClick={onRequestReselect || onClose}>Escolher Outra</button>
                        <button className="puncher-btn" onClick={onClose}>Cancelar</button>
                    </div>

                    <img
                        ref={imageRef}
                        src={preview}
                        className="punchTargetImg"
                        style={{ transform: `scale(${zoom})`, transition: 'transform 0.1s ease-out' }}
                        alt="Alvo do recorte"
                    />

                    <div className="workspace-hint">Arraste o mouse e clique para carimbar o selo no diário<br /><small style={{ opacity: 0.7 }}>Use a rodinha do mouse/trackpad para dar zoom</small></div>

                    <div ref={cursorRef} className={`puncher-tool ${isPressing ? 'pressing' : ''} ${isPunching ? 'punching' : ''}`}>
                        <img
                            src="/src/assets/cortador.png"
                            style={{ width: '100%', height: '100%', filter: 'drop-shadow(0px 30px 40px rgba(0,0,0,0.6))' }}
                            alt="Cortador cursor"
                        />
                    </div>
                </>
            )}
        </div>
    )
}

export default PhotoModal
