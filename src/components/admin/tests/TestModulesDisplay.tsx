
import React from 'react';
import { DEFAULT_MODULES } from './types';

const TestModulesDisplay: React.FC = () => {
  return (
    <div className="border rounded-lg p-4">
      <h3 className="text-lg font-medium mb-4">Test Modules</h3>
      <p className="text-sm text-gray-600 mb-4">
        This test includes 2 standard modules:
      </p>
      <div className="grid grid-cols-2 gap-3 mb-4">
        {DEFAULT_MODULES.map((module, index) => (
          <div 
            key={index}
            className={`p-3 border rounded-md ${
              module.type === "reading_writing" ? "bg-blue-50" : "bg-purple-50"
            }`}
          >
            <h4 className="font-medium">Module {index + 1}: {module.name}</h4>
            <p className="text-sm text-gray-600">
              {module.type === "reading_writing" 
                ? "Reading comprehension and language skills" 
                : "Mathematics and quantitative reasoning"}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TestModulesDisplay;
