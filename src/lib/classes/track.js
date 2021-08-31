class track {
  constructor(data) {
    if (data.addedBy) {
      this.addedBy = data.addedBy;
    }
    this.title = data.title;
    this.url = data.url ?? "https://www.youtube.com/watch?v=" + data.id;
    this.duration = data.duration ?? "0:00";
  }
}
module.exports = track;