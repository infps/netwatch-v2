const Card = ({ text, data }: { text: string; data: string }) => {
  return (
    <div className="w-full bg-white p-6 rounded-lg shadow-sm">
      <p className="text-sm text-neutral-500">{text}</p>
      <p className="text-2xl font-bold text-neutral-900">{data}</p>
    </div>
  );
};

export default Card;
