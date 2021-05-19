class track {
  constructor(data) {
    if (data.addedBy) {
      this.addedBy = data.addedBy;
    }
    this.title = data.title;
    this.id = data.id;
    this.duration = data.duration;
  }
}
module.exports = track;