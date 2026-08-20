type SubmitButtonProps = {
  label: string;
  isSubmitting: boolean;
};

const SubmitButton = ({ label, isSubmitting }: SubmitButtonProps) => {
  return (
    <div className="flex justify-end">
      <button
        type="submit"
        disabled={isSubmitting}
        className="min-h-11 w-full rounded-lg border border-slate-900 bg-slate-900 px-6 py-3 font-semibold text-white shadow-sm transition-all duration-200 hover:border-slate-800 hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-200 disabled:cursor-not-allowed disabled:border-slate-400 disabled:bg-slate-400 sm:w-auto"
      >
        {isSubmitting ? '토픽 생성 중...' : label}
      </button>
    </div>
  );
};

export default SubmitButton;
