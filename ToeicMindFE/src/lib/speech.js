// Phát âm từ tiếng Anh bằng giọng đọc của trình duyệt (không phụ thuộc dịch vụ ngoài).
export function speak(text) {
  try {
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'en-US'
    utterance.rate = 0.9
    speechSynthesis.cancel()
    speechSynthesis.speak(utterance)
  } catch { /* Trình duyệt không hỗ trợ giọng đọc. */ }
}

export function stopSpeaking() {
  try { speechSynthesis.cancel() } catch { /* Bỏ qua. */ }
}
