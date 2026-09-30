import test from 'node:test';
import assert from 'node:assert/strict';
import { orderIssues as subject } from '../../interview-03/_interviewer/reference.mjs';
const examples=[
  {
    "label": "Diamond dependency graph",
    "args": [
      [
        {
          "id": "B",
          "dependsOn": [
            "A"
          ]
        },
        {
          "id": "C",
          "dependsOn": [
            "A"
          ]
        },
        {
          "id": "A",
          "dependsOn": []
        },
        {
          "id": "D",
          "dependsOn": [
            "B",
            "C"
          ]
        }
      ]
    ],
    "expected": [
      "A",
      "B",
      "C",
      "D"
    ]
  },
  {
    "label": "Newly available node can precede an older ready node",
    "args": [
      [
        {
          "id": "Z",
          "dependsOn": []
        },
        {
          "id": "B",
          "dependsOn": []
        },
        {
          "id": "A",
          "dependsOn": [
            "B"
          ]
        }
      ]
    ],
    "expected": [
      "B",
      "A",
      "Z"
    ]
  },
  {
    "label": "Duplicate dependency tokens count once",
    "args": [
      [
        {
          "id": "B",
          "dependsOn": [
            "A",
            "A"
          ]
        },
        {
          "id": "A",
          "dependsOn": []
        }
      ]
    ],
    "expected": [
      "A",
      "B"
    ]
  }
];
function freeze(value) {
  if(value && typeof value==='object') {
    for(const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}
for(const example of examples) {
  test(example.label,()=>{
    const args=structuredClone(example.args);
    const before=structuredClone(args);
    freeze(args);
    assert.deepEqual(subject(...args),example.expected);
    assert.deepEqual(args,before);
  });
}
