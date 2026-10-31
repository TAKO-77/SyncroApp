/**
 * Text whose letters come in one by one out of a blur. Letters are grouped per word so lines only break
 * between words. Screen readers get the plain text. `from` offsets the stagger.
 */
export function RevealText({ text, from = 0 }: { text: string; from?: number }) {
  let k = from
  return <><span className="sr">{text}</span><span key={text} aria-hidden="true">{text.split(' ').map((word, w) => <span key={w}>
    {w > 0 && ' '}<span className="rv-w">{Array.from(word, (ch, c) => <span key={c} className="rv" style={{ ['--i' as string]: k++ }}>{ch}</span>)}</span>
  </span>)}</span></>
}
