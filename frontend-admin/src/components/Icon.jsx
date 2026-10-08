export default function Icon({ name, width = 16, height = 16, size, style, ...props }) {
  const w = size || width;
  const h = size || height;
  return (
    <svg width={w} height={h} style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }} {...props}>
      <use href={`#i-${name}`} />
    </svg>
  );
}
