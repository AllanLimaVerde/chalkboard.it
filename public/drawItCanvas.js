const canvas = document.querySelector('canvas')
const colorBar = document.getElementById('color-bar')

canvas.width = window.innerWidth
canvas.height = window.innerHeight

const ctx = canvas.getContext('2d')

const fps = 10;
const background = 'rgb(34, 34, 34)'
var drawColor = 'white'
var drawSize = 50

var posArray = []
var buttonDown = false

const drawPoint = (pos, color = drawColor, size = drawSize) => {
    ctx.fillStyle = color;
    ctx.beginPath()
    ctx.arc(pos[0], pos[1], size, 0, 2 * Math.PI)
    ctx.fill()
}

const onWindowResize = () => {
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
}

const mouseDown = event => {
    buttonDown = true
    const pos = [event.clientX, event.clientY]
    drawPoint(pos, drawColor, drawSize)
    posArray.push(pos)
}

const mouseDownColorBar = event => {
    console.log(event)
}

const mouseUp = event => {
    buttonDown = false
}

const mouseMove = event => {
    if (!buttonDown) return
    
    const pos = [event.clientX, event.clientY]
    drawPoint(pos, drawColor, drawSize)
    posArray.push(pos)
}

const wheel = event => {
    drawSize -= event.deltaY/53
    if (drawSize < 0) drawSize = 0
}

window.addEventListener('resize', onWindowResize);
canvas.addEventListener('mousedown', mouseDown)
colorBar.addEventListener('mousedown', mouseDownColorBar)
document.addEventListener('mouseup', mouseUp)
document.addEventListener('mousemove', mouseMove)
document.addEventListener('wheel', wheel)





// const clearScreen = () => {
//     ctx.fillStyle = background;
//     ctx.fillRect(0,0,canvas.clientWidth, canvas.height)
// }

// const drawScreen = () => {
//     ctx.fillStyle = drawColor;
//     posArray.forEach(pos => {
//         ctx.beginPath()
//         ctx.arc(pos[0], pos[1], 50, 0, 2 * Math.PI)
//         ctx.fill()
//     })
// }