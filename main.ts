// create nodes with values
// do operations on them
// differentiate operations

// type DifferentiableNode = {
//   value: number
//   gradientFunc: (value: number) => number
// }

const a = 2
const x = 4
const b = 7

const y = a * x + b

//          y
//          |
//          +
//        /   \
//      *       b
//    /   \
//  a       x

// we want something like
//       plus(mul(a, x), b)
// or
//       a.mul(b).plus(b)
// yea I like the first one better. Data structures and functions ftw

//          y
//          |
//          +
//        /   \
//      *       b
//    /   \
//  a       x
// 
// differentiating y w.r.t. params should give
//   - b = 1
//   - a = x
//   - x = a

// So therefore somewhere needs to hold the fact of which nodes are operated together
//
// Should it be a graph?
// something like:
// const expr = {
//   value: 15,
//   resultOf: {
//     op: '+',
//     children: [
//       {
//         value: 8,
//         resultOf: {
//           op: '*',
//           children: [
//             {
//               value: 2,
//             },
//             {
//               value: 4,
//             }
//           ]
//         }
//       },
//       {
//         value: 7
//       }
//     ]
//   }
// }

type Op = {
  symbol: string;
  forward: (a: number, b: number) => number;
  backward: (a: number, b: number) => [number, number];
  // backwardForOne: (one: number, other: number) => number;
}

type Expr = (
  | { type: 'val'; value: number }
  | { type: 'calc'; calc: Calc }
)

type Calc = {
  op: Op;
  children: Expr[];
}

type CalcWithDx = {
  op: Op,
  children: ExprWithDx[]
}

type ExprWithDx = (
  | { type: 'val', value: number, grad: number }
  | { type: 'calc', calc: CalcWithDx }
)

// I think these types make sense
//  - Op represents any generic operation between 2 children
//  - Calculation represents the application of an operation to it it's operands
//  - Expr is a "thing" that holds to record of how it came be be.

// const Mul: Op = {
//   symbol: '*',
//   forward: (a, b) => a.value * b.value,
//   backward: (a, b) => [b.value, a.value],
// }

// const Add: Op = {
//   symbol: '+',
//   forward: (a, b) => a.value + b.value,
//   backward: (_a, _b) => [1, 1],
// }

const Mul: Op = {
  symbol: '*',
  forward: (a, b) => a * b,
  backward: (a, b) => [b, a],
}

const Add: Op = {
  symbol: '+',
  forward: (a, b) => a + b,
  backward: (_a, _b) => [1, 1],
}

const expr1: Calc = {
  op: Add,
  children: [{
    type: 'calc',
    calc: {
      op: Mul,
      children: [{
        type: 'val',
        value: 2,
      }, {
        type: 'val',
        value: 4,
      }]
    }
  }, {
    type: 'val',
    value: 7,
  }]
}

const expr2: Calc = {
  op: Mul,
  children: [{
    type: 'val',
    value: 8,
  }, {
    type: 'val',
    value: 3,
  }]
}

// I think if we can generate graphs like the above, we'll be able to traverse them backwards and generate the gradients above
// I want add(mul(a, x), b)
// actually you know what'd be cool, if we had op('add', op('mul', a, b), x)
// nah actually that fucking sucks, you cant make this lisp haha

const apply = (op: Op, a: Expr, b: Expr): Calc => {
  return {
    op,
    children: [a, b]
  }
}


function val(value: number): Expr {
  return { type: 'val', value }
}

function calc(calc: Calc): Expr {
  return { type: 'calc', calc }
}

const Expr = { fromVal: val, fromCalc: calc }

function valueOf(e: Expr): number {
  if (e.type === 'val')
    return e.value;

  const { calc } = e;

  return calc.op.forward(valueOf(calc.children[0]), valueOf(calc.children[1]))
}

function zip<T1, T2>(a1: T1[], a2: T2[]): [T1, T2][] {
  return a1.map((e, i) => [e, a2[i]])
}

// function withPartialDervitives
function partialDerivativesOf(calc: Calc, upstreamGradient = 1): CalcWithDx {

  const values = calc.children.map(valueOf) // (calc.children[0]), valueOf(calc.children[1])]
  const grads = calc.op.backward(...values as [number, number]).map(g => g * upstreamGradient)

  let children: ExprWithDx[] = [];

  for (const i of [0, 1]) {
    const child = calc.children[i]
    const grad = grads[i]

    if (child.type === 'val') {
      children.push({ ...child, grad })
    }
    else if (child.type === 'calc') {
      children.push({ ...child, calc: partialDerivativesOf(child.calc, grad) });
    }
  }

  return {
    op: calc.op,
    children,
  }
}

const mul = (a: Expr, b: Expr) => calc(apply(Mul, a, b))
const add = (a: Expr, b: Expr) => calc(apply(Add, a, b))

//-//-//-//-//-//-//-//-//-//-//-//-//-//-//-//-//-//-



const res = add(val(1.2), mul(val(8), val(3)))

console.log(res)
console.log(valueOf(res));
// console.log(partialDerivativesOf(calc(res))))

const rescalc = apply(Add, val(1.2), mul(val(8), val(3)))

console.log(JSON.stringify(partialDerivativesOf(rescalc), null, 2))


