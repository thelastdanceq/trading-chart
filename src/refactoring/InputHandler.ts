export class InputHandler {
  constructor(
    private canvas: HTMLCanvasElement,
    private config: {
      onDrag: (deltaX: number, deltaY: number) => void;
      onMouseMove: (x: number, y: number) => void;
      onMouseWheel: (
        deltaX: number,
        deltaY: number,
        canvasMouseX: number
      ) => void;
      onResize: (newWindowX: number, newWindowY: number) => void;
    }
  ) {
    this.addEventListeners();
  }

  private addEventListeners() {
    this.canvas.addEventListener("mousedown", this.handleMouseDown);
    this.canvas.addEventListener("mousemove", this.handleMouseMove);
    this.canvas.addEventListener("mouseup", this.handleMouseUp);
    this.canvas.addEventListener("mouseleave", this.handleMouseLeave);
    this.canvas.addEventListener("wheel", this.handleMouseWheel);
    window.addEventListener("resize", this.handleResize);
  }

  private handleMouseDown = () => {
    this.canvas.style.cursor = "grabbing";
  };

  private handleMouseMove = (event: MouseEvent) => {
    const mouseX = event.clientX - this.canvas.getBoundingClientRect().left;
    const mouseY = event.clientY - this.canvas.getBoundingClientRect().top;

    if (event.buttons === 1) {
      this.config.onDrag(event.movementX, event.movementY);
    }

    this.config.onMouseMove(mouseX, mouseY);
  };

  private handleMouseUp = () => {
    this.canvas.style.cursor = "default";
  };

  private handleMouseLeave = () => {
    this.canvas.style.cursor = "default";
  };

  private handleMouseWheel = (event: WheelEvent) => {
    event.preventDefault();
    const deltaX = event.deltaX;
    const deltaY = event.deltaY;

    const mouseX = event.clientX - this.canvas.getBoundingClientRect().left;
    this.config.onMouseWheel(deltaX, deltaY, mouseX);
  };

  private handleResize = () => {
    this.config.onResize(window.innerWidth, window.innerHeight);
  };
}
