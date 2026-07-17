import { forwardRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}

const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>((props, ref) => {
  const [show, setShow] = useState<boolean>(false);
  const { className = '', ...rest } = props;

  return (
    <div className="relative">
      <input
        ref={ref}
        type={show ? 'text' : 'password'}
        className={`${className} pr-10`}
        {...rest}
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        className="absolute right-0 top-1/2 -translate-y-1/2 min-w-[44px] min-h-[44px] flex items-center justify-center text-ink-mute hover:text-ink transition-colors cursor-pointer"
        aria-label="Toggle password visibility"
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
});

PasswordInput.displayName = 'PasswordInput';

export default PasswordInput;
