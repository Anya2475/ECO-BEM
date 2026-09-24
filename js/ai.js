/* ═══ AI Teacher ═══ */

function sendAIMessage() {
  const i = document.getElementById('chat-in');
  if (!i) return;
  const t = i.value.trim(); if (!t) return;
  i.value = ''; AITeacher.send(t);
}
