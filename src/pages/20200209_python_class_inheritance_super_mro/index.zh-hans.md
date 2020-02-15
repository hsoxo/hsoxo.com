---
title: Python中的继承 (super() 与 __mro__)
date: '2020-02-09'
spoiler: super()调用父类的方式，以及动态修改继承关系的讨论
tags: Python
--- 

## 单继承

在Python中，当我们定义一个新的类（class）的时候，可以从某个现有的类继承，新的类称为子类（Subclass），而被继承的类称为基类、父类或超类（Base class、Super class）。

在类继承中，我们最常见的是在子类中重载`.__init__`方法，我们需要同时调用父类的`.__init__`以确保父类也正确的实例化。我们通常有两种方法来调用父类的方法，使用`super()`和直接使用父类的类名。如下所示，

```Python
class A:
    def __init__(self):
        self.x = 0

class B(A):
    def __init__(self):
        super().__init__()
        self.y = 1
        
class AnotherB(A):
    def __init__(self):
        A.__init__()
        self.y = 1
```

在单继承的时候，`B`和`AnotherB`在效果上没有任何差别。唯一的区别是，当子类的父类被修改时，`B`可以正常运行，而`AnotherB`中的`A.__init__()`需要换成新修改的类名。通常情况，我们会用`super()`来调用父类的方法。在某些项目中你也会看到`super(Class, self)`这种用法，这种用法是Python2中的调用方式，在Python3中可以直接调用`super()`。

## 多继承

Python是支持多继承关系的，对于每一个自定义类，Python会按照C3 Linearization算法计算出一个Method Resolution Order(MRO)列表并储存在类的`.__mro__`属性中。这个算法遵循三个准则

- 子类会先于父类被检查
- 多个父类会根据它们在列表中的顺序被检查
- 如果对下一个类存在两个合法的选择，选择第一个父类

首先我们先定义几个基类，

```Python
class Base:
    def __init__(self):
        print('Base.__init__')

class A(Base):
    def __init__(self):
        super().__init__()
        print('A.__init__')

class B(Base):
    def __init__(self):
        super().__init__()
        print('B.__init__')
```

如果我们定义一个`C`同时继承自`A`和`B`，

```Python
class C(A,B):
    pass
```

类`C`的父类如下，

```Python
>>> C.__mro__
(<class '__main__.C'>, <class '__main__.A'>, <class '__main__.B'>,  
<class '__main__.Base'>, <class 'object'>)
```

同单继承一样，我们有两种方法在`C`中重载`__init__`方法时，同时实例化`A`和`B`。与单继承不一样的是，他们会有些许区别

```Python
class C(A,B):
    def __init__(self):
        super().__init__() 
        print('C.__init__')
        
class AnotherC(A,B):
    def __init__(self):
        A.__init__(self)
        B.__init__(self)
        print('C.__init__')
```

当我们实例化这两个类时，结果如下

```Python
>>> c1 = C()
Base.__init__
B.__init__
A.__init__
C.__init__

>>> c2 = AnotherC()
Base.__init__
B.__init__
A.__init__
Base.__init__
B.__init__
C.__init__
```

可以看到使用了 `super()` 的 `C` 只会执行一次 `Base.__init__`，而分别执行 `A.__init__` 和 `B.__init__` 的 `AnotherC` 只会执行两次 `Base.__init__`。当使用 `super()` 函数时，Python会在MRO列表上继续搜索下一个类。 只要每个重定义的方法统一使用 `super()` 并只调用它一次， 那么控制流最终会遍历完整个MRO列表，每个方法也只会被调用一次。 这也是为什么在 `C` 中不会调用两次 `Base.__init__()` 的原因。

在使用 `super()` 的时候需要额外注意的一点是，它并不一定去查找类在MRO中下一个直接父类。考虑如下这个类：

```Python
class A:
    def spam(self):
        print('A.spam')
        super().spam()
```

我们在使用这个类的时候会出错，因为 `A` 的父类 `object` 没有 `spam` 方法。

```Python
>>> A().spam()
A.spam
Traceback (most recent call last):
  File "<input>", line 1, in <module>
  File "<input>", line 5, in spam
AttributeError: 'super' object has no attribute 'spam'
```

但是，如果使用多继承的话：

```Python
>>> class B:
...     def spam(self):
...         print('B.spam')
...
>>> class C(A,B):
...     pass
...
>>> c = C()
>>> c.spam()
A.spam
B.spam
>>>
```

可以看到在 `A` 中使用的 `super().spam()` 实际上调用的是跟 `A` 毫无关系的 `B`中的 `spam()` 方法。 但是从 `C` 的MRO列表就可以完全解释清楚了：

```Python
>>> C.__mro__
(<class '__main__.C'>, <class '__main__.A'>, <class '__main__.B'>,
<class 'object'>)
```

## 混入类

混入类是一种Python程序设计中的技术，混入类是为代码重用而生的。从概念上讲，混入类并不定义类，只是打包方法，便于重用。混入类应该提供某方面的特定行为，只实现少量关系非常紧密的方法并且**混入类绝对不能实例化**。

例如
```Python
from collections import defaultdict


class SetOnceMappingMixin:
    '''
    Only allow a key to be set once.
    '''
    __slots__ = ()

    def __setitem__(self, key, value):
        if key in self:
            raise KeyError(str(key) + ' already set')
        return super().__setitem__(key, value)
        
        
class SetOnceDefaultDict(SetOnceMappingMixin, defaultdict):
    pass


d = SetOnceDefaultDict(list)
d['x'].append(2)
d['x'].append(3)
# d['x'] = 23  # KeyError: 'x already set'
```

在一些大型库和框架中也会发现混入类的使用，用途同样是增强已存在的类的功能和一些可选特征。

## 动态继承

不要忘记Python是一个动态语言，在程序执行过程中，继承关系也可以通过修改。对于类的继承关系修改，我们可以通过修改类的 `__bases__` 实现，考虑如下定义的类

```Python
class Gentleman(object):
    def introduce_self(self):
        return "Hello, my name is %s" % self.name

class Base(object):
    pass

class Person(Base):
    def __init__(self, name):
        self.name = name
```

从类的定义上来看，`Person` 没有 `introduce_self` 方法，但是可以在程序运行中，让 `Person` 从 `Gentleman` 继承此方法：

```Python
>>> p = Person("John")
>>> p.introduce_self()
Traceback (most recent call last):
  File "<input>", line 1, in <module>
AttributeError: 'Person' object has no attribute 'introduce_self'
>>> Person.__bases__ = (Gentleman, )
>>> p.introduce_self()
'Hello, my name is John'
```

如果我们查看 `__mro__` 我们就会发现 `Person` 的继承关系已经改变了。

```Python
>>> Person.__mro__
(<class '__main__.Person'>, <class '__main__.Gentleman'>, <class 'object'>)
```

修改类的 `__bases__` 会影响这个类的所有实例，包括已经存在的实例，而如果我们只想针对某一个实例，修改继承关系呢？例如动态的混入一个类，Python并没有给我们一个修改实例的类继承关系的方法，但是我们可以修改实例的类属性实现我们想要的功能：

```Python
>>> p = Person("John")
>>> p.__class__ = type('GentlePerson',(Gentleman, ) + p.__class__.__mro__,{})
>>> p.introduce_self()
'Hello, my name is John'
>>> p2 = Person("Tom")
>>> p2.introduce_self()
Traceback (most recent call last):
  File "<input>", line 1, in <module>
AttributeError: 'Person' object has no attribute 'introduce_self'
```

如果我们查看 `p.__class__` 我们就会发现 `p` 已经变成了 `GentlePerson` 的实例，而不再是 `Person` 的实例。

```Python
>>> p.__class__
<class '__main__.GentlePerson'>
>>> p.__class__.__mro__
(<class '__main__.GentlePerson'>, <class '__main__.Gentleman'>, <class '__main__.Person'>, 
<class '__main__.Base'>, <class 'object'>)
```

### Reference 

1. David Beazley and Brian K. Jones. 2013. Python Cookbook. O’Reilly Media, Inc.
2. Luciano Ramalho. 2015. Fluent Python (1st. ed.). O’Reilly Media, Inc.
3. How to dynamically change base class of instances at runtime?. StackOverflow. [🔗](https://stackoverflow.com/q/9539052)