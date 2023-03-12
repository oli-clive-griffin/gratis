(console as any).pp = (a: any) => console.log(JSON.stringify(a, null, 2))

// We want to be able to
//  - create nodes with values
//  - do operations on them
//  - differentiate operations

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

type Op<Args extends number[] = number[]> = {
  symbol: string;
  forward: (...args: Args) => number;
  backward: (...args: Args) => Args;
}


/** a piece of data, or a calculation that can resolve to a piece of data */
type Expr = (
  | { type: 'val'; value: number }
  | { type: 'calc'; calc: Calc }
)

/** an operation applied to 1 or more expressions */
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

const Mul: Op = {
  symbol: '*',
  forward: (...args) => args.reduce((a, c) => a * c, 1),
  backward: (...args) => {
    const total = args.reduce((a, c) => a * c, 1);
    return args.map(a => total / a);
  },
}

const Add: Op = {
  symbol: '+',
  forward: (...args) => args.reduce((a, c) => a + c, 0),
  backward: (...args) => args.map(_a => 1),
}

const Exp: Op = {
  symbol: 'e^',
  forward: (x) => Math.exp(x),
  backward: (x) => [x],
}

const Sin: Op = {
  symbol: 'sin',
  forward: (x) => Math.sin(x),
  backward: (x) => [Math.cos(x)],
}

const Cos: Op = {
  symbol: 'cos',
  forward: (x) => Math.cos(x),
  backward: (x) => [-Math.sin(x)],
}


// I think if we can generate graphs like the above, we'll be able to traverse them backwards and generate the gradients above
// I want add(mul(a, x), b)
// actually you know what'd be cool, if we had op('add', op('mul', a, b), x)
// nah actually that fucking sucks, you cant make this lisp haha

function calculate(op: Op, a: Expr, b: Expr): Calc {
  return {
    op,
    children: [a, b]
  };
}

function val(value: number): Expr {
  return { type: 'val', value }
}

function eval(calc: Calc): Expr {
  return { type: 'calc', calc }
}

function valueOf(e: Expr): number {
  if (e.type === 'val')
    return e.value;

  const { calc } = e;

  return calc.op.forward(valueOf(calc.children[0]), valueOf(calc.children[1]))
}

// the default `1` here can be thought of the the gradient of the loss wrt the loss. very simple
function withDx(calc: Calc, upstreamGradient = 1): CalcWithDx {

  const values = calc.children.map(valueOf) // (calc.children[0]), valueOf(calc.children[1])]
  const grads = calc.op.backward(...values).map(g => g * upstreamGradient)

  let children: ExprWithDx[] = [];

  for (const i of Array(calc.children.length).keys()) {
    const child = calc.children[i]
    const grad = grads[i]

    if (child.type === 'val') {
      children.push({
        ...child,
        grad,
      })
    }
    else if (child.type === 'calc') {
      children.push({
        ...child,
        calc: withDx(child.calc, grad),
      });
    }
  }

  return {
    ...calc,
    children,
  }
}

function mul(a: Expr, b: Expr): Expr {
  return eval(calculate(Mul, a, b));
}

function add(a: Expr, b: Expr): Expr {
  return eval(calculate(Add, a, b));
}

// ------------------------------------------------------------------------ //

const res = add(val(1.2), mul(val(8), val(3)))

// console.log(res)
// console.log(valueOf(res));
// console.log(withDx(calc(res))))

// const rescalc = apply(Add, val(1.2), mul(val(8), val(3)))
// const a = withDx(rescalc)
// console.log(JSON.stringify(a, null, 2))

// const a = val(8);
// const x = val(3);
// const y = mul(a, x)
// const resCalc2 = apply(Mul, val(1.2), a)
// const b = withDx(resCalc2)
// console.log(JSON.stringify(b, null, 2))
