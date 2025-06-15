// Self-contained Clock Module
class ClockRenderer {
  constructor(elementId) {
    this.timeElement = document.getElementById(elementId);
    this.init();
  }

  init() {
    this.updateTime();
    // Update every second
    setInterval(() => this.updateTime(), 1000);
  }

  updateTime() {
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    
    // Convert to 12-hour format and remove leading zero
    hours = hours % 12 || 12;
    
    const timeString = `${hours}:${minutes} ${ampm}`;
    if (this.timeElement) {
      this.timeElement.textContent = timeString;
    }
  }
}
