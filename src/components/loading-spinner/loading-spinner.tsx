type LoadingSpinnerProps = {
  containerClass?: string;
  spinnerClass?: string;
};

export const LoadingSpinner = ({ containerClass, spinnerClass }: LoadingSpinnerProps) => {
  return (
    <div className={`h-20 spinner-container flex justify-items-center items-start ${containerClass ?? ""}`}>
      <div className={`${spinnerClass ?? "spinner"}`}></div>
    </div>
  );
};
