type LoadingSpinnerProps = {
  containerClass: string | null;
};

export const LoadingSpinner = ({ containerClass }: LoadingSpinnerProps) => {
  return (
    <div>
      <div className={`spinner-container ${containerClass ?? ""}`}>
        <div className="spinner"></div>
      </div>
    </div>
  );
};
