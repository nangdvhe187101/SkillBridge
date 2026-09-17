export default function Icon({ name, ...props }) {
  const isLabeled = !!props['aria-label'] || !!props['aria-labelledby'];
  return (
    <svg aria-hidden={isLabeled ? undefined : 'true'} {...props}>
      <use href={`#i-${name}`} />
    </svg>
  );
}
