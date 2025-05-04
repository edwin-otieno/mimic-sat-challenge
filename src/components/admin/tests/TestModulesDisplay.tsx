
import React from 'react';

const TestModulesDisplay: React.FC = () => {
  return (
    <div className="border rounded-lg p-4">
      <h3 className="text-lg font-medium mb-4">Test Modules</h3>
      <p className="text-sm text-gray-600 mb-4">
        This test includes 2 standard modules:
      </p>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-3 border rounded-md bg-blue-50">
          <h4 className="font-medium">Module 1: Reading & Writing</h4>
          <p className="text-sm text-gray-600">Reading comprehension and language skills</p>
        </div>
        <div className="p-3 border rounded-md bg-purple-50">
          <h4 className="font-medium">Module 2: Math</h4>
          <p className="text-sm text-gray-600">Mathematics and quantitative reasoning</p>
        </div>
      </div>
    </div>
  );
};

export default TestModulesDisplay;
