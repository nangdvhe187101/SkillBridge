export default function Icon({ name, ...props }) {
  return (
    <svg {...props}>
      <use href={`#i-${name}`} />
    </svg>
  );
}
