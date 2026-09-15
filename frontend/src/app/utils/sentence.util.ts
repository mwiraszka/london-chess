// Toast messages read as full sentences, while the same strings shown inline
// under a form field deliberately carry no terminal punctuation. The period is
// added here, at the toast call site, rather than at the message's source.
export function asSentence(text: string): string {
  return /[.!?]$/.test(text) ? text : `${text}.`;
}
