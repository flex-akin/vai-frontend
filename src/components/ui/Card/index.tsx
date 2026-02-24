import type { FC, ReactNode } from "react";

interface CardProps {
  className?: string;
  children: ReactNode;
}

const Card: FC<CardProps> = ({ className, children }) => {
  const newClassName = "" + " " + className;
  return <div className={newClassName}>{children}</div>;
};

export default Card;