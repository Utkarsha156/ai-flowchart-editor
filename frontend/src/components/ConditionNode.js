import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import './ConditionNode.css';

const ConditionNode = ({ data }) => {
  return (
    <>
      <div className="condition-node">
        <div className="label">
          {data.label}
        </div>
      </div>
      {/* Input handle at the top */}
      <Handle type="target" position={Position.Top} id="top-target" />
      {/* Output handles for Yes/No branches - positioned at actual diamond corners */}
      <Handle 
        type="source" 
        position={Position.Bottom} 
        id="left-source" 
        style={{ bottom: '50%', left: '0%', transform: 'translate(-50%, 50%)' }}
      />
      <Handle 
        type="source" 
        position={Position.Bottom} 
        id="right-source" 
        style={{ bottom: '50%', left: '100%', transform: 'translate(50%, 50%)' }}
      />
    </>
  );
};

export default memo(ConditionNode);