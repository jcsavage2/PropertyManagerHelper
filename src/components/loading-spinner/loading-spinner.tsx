type LoadingSpinnerProps = {
  containerClass?: string;
  spinnerClass?: string;
};

export const LoadingSpinner = ({ containerClass, spinnerClass }: LoadingSpinnerProps) => {
  return (
    <div className={`spinner-container flex justify-items-center ${containerClass ?? ""}`}>
      <div className={`${spinnerClass ?? ""}`}></div>
    </div>
  );
};
