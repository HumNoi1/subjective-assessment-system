// File: components/Card.js
export default function Card({ title, children, className = "", footer = null }) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden ${className}`}>
        {title && (
          <div className="px-6 py-4 border-b">
            <h2 className="font-semibold text-lg">{title}</h2>
          </div>
        )}
        
        <div className="p-6">
          {children}
        </div>
        
        {footer && (
          <div className="px-6 py-4 border-t bg-gray-50">
            {footer}
          </div>
        )}
      </div>
    )
  }