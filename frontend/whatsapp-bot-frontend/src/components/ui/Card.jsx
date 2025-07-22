import { clsx } from 'clsx';

const Card = ({ 
  children, 
  className = '',
  padding = 'default',
  ...props 
}) => {
  const baseStyles = 'bg-white rounded-lg border border-gray-200 shadow-sm';
  
  const paddingStyles = {
    none: '',
    sm: 'p-4',
    default: 'p-6',
    lg: 'p-8'
  };
  
  return (
    <div 
      className={clsx(
        baseStyles,
        paddingStyles[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

const CardHeader = ({ children, className = '', ...props }) => (
  <div 
    className={clsx('pb-4 border-b border-gray-200 mb-4', className)}
    {...props}
  >
    {children}
  </div>
);

const CardTitle = ({ children, className = '', ...props }) => (
  <h3 
    className={clsx('text-lg font-medium text-gray-900', className)}
    {...props}
  >
    {children}
  </h3>
);

const CardContent = ({ children, className = '', ...props }) => (
  <div 
    className={clsx('', className)}
    {...props}
  >
    {children}
  </div>
);

const CardFooter = ({ children, className = '', ...props }) => (
  <div 
    className={clsx('pt-4 border-t border-gray-200 mt-4', className)}
    {...props}
  >
    {children}
  </div>
);

Card.Header = CardHeader;
Card.Title = CardTitle;
Card.Content = CardContent;
Card.Footer = CardFooter;

export default Card; 