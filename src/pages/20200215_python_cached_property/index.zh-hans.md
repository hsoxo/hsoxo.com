---
title: Python中的缓存属性
date: '2020-02-15'
spoiler: 缓存属性的实现方法和描述符的工作原理
tags: Python
---

在Python中，我们经常使用 `@property` 定义实例属性。但是有些时候，我们定义的属性需要相对长的计算时间，而使用 `@property` 定义的属性在每次使用时，都会重复执行一次计算，这既浪费了计算资源，也影响了程序的性能。虽然我们可以在 `__init__` 中提前计算好实例的属性值，但是有些时候这个属性并不是每个实例都需要使用的。因此，我们想定义一个不会重复执行计算的属性。

在Python的很多包中都有类似的实现，比如 `Django` 中的 `django.utils.functional.cached_property`，`Werkzeug` 中的 `werkzeug.utils.cached_property`。

对于内置方法，在 Python 3.8 之前，我们可以使用内置的 `functools.lru_cache` 实现类似功能，但是此方法的实际功能是对程序中的全部函数结果进行缓存（包括函数名和参数），并有最大数量限制。如果数量超过最大限制，缓存即消失。此种缓存实现比较复杂，性能也相对较低。

从 Python 3.8 开始，Python 内置了 `functools.cached_property`。这个修饰符与 `django` 和 `werkzeug` 中实现的方式大同小异，但是加入了线程安全的保护。

我们先看一下真・缓存 `lru_cache` 和属性缓存 `cached_property` 的性能差异。

```Python
>>> setup = """\
... from functools import lru_cache, cached_property
... class Test:
...     
...     @property
...     @lru_cache(maxsize=10)
...     def use_lru(self):
...         return 1
...    
...     @cached_property
...     def use_cached_property(self):
...         return 1
... t = Test()
... t.use_lru"""
>>> timeit('t.use_lru', setup=setup, number=100000)
0.008052477991441265
>>> timeit('t.use_cached_property', setup=setup, number=100000)
0.004390793008496985
```

可以看到真・缓存的速度大概是缓存属性的1.8倍左右。下面，我们以 `functools.cached_property` 为例看看缓存属性是如何实现的，以下是Python 3.8 中的源代码。

```Python
################################################################################
### cached_property() - computed once per instance, cached as attribute
################################################################################

_NOT_FOUND = object()


class cached_property:
    def __init__(self, func):
        self.func = func
        self.attrname = None
        self.__doc__ = func.__doc__
        self.lock = RLock()

    def __set_name__(self, owner, name):
        if self.attrname is None:
            self.attrname = name
        elif name != self.attrname:
            raise TypeError(
                "Cannot assign the same cached_property to two different names "
                f"({self.attrname!r} and {name!r})."
            )

    def __get__(self, instance, owner=None):
        if instance is None:
            return self
        if self.attrname is None:
            raise TypeError(
                "Cannot use cached_property instance without calling __set_name__ on it.")
        try:
            cache = instance.__dict__
        except AttributeError:  # not all objects have __dict__ (e.g. class defines slots)
            msg = (
                f"No '__dict__' attribute on {type(instance).__name__!r} "
                f"instance to cache {self.attrname!r} property."
            )
            raise TypeError(msg) from None
        val = cache.get(self.attrname, _NOT_FOUND)
        if val is _NOT_FOUND:
            with self.lock:
                # check if another thread filled cache while we awaited lock
                val = cache.get(self.attrname, _NOT_FOUND)
                if val is _NOT_FOUND:
                    val = self.func(instance)
                    try:
                        cache[self.attrname] = val
                    except TypeError:
                        msg = (
                            f"The '__dict__' attribute on {type(instance).__name__!r} instance "
                            f"does not support item assignment for caching {self.attrname!r} property."
                        )
                        raise TypeError(msg) from None
        return val
```

## 第一个知识点 —— Magic Method `__set_name__`

`__set_name__` 是在 [PEP 487](https://www.python.org/dev/peps/pep-0487/) 中提出，并在 Python 3.6 中实现的针对 descriptor class 的魔术方法。[PEP 487](https://www.python.org/dev/peps/pep-0487/) 中提到的增加此魔术方法的原因如下，

> Descriptors are defined in the body of a class, but they do not know anything about that class, they do not even know the name they are accessed with. They do get to know their owner once `__get__` is called, but still they do not know their name. This is unfortunate, for example they cannot put their associated value into their object's `__dict__` under their name, since they do not know that name. This problem has been solved many times, and is one of the most important reasons to have a metaclass in a library. While it would be easy to implement such a mechanism using the first part of the proposal, it makes sense to have one solution for this problem for everyone.

此前，一个修饰符在所述类实例化时，是无法得知所述类的信息和自己所修饰的方法的名字的。如果想要实现这样的功能，我们不得不使用元类。这个魔术方法是在所属类生成实例时，对修饰符进行实例化的时执行的。这个魔术方法的两个参数 `owner` 时所属类，`name` 是被修饰的函数名。

举个例子，在此前，我们需要定义以下修饰符：

```Python
class String:
    def __init__(self, name):
        self.name = name

    def __get__(self, instance, cls): 
        if instance is None:
            return self
        return instance.__dict__[self.name]

    def __set__(self, instance, value): 
        if not isinstance(value, str):
            raise TypeError('Expected a string') 
        instance.__dict__[self.name] = value
```

这个修饰符代表这个属性只能使用字符串赋值，我们在使用这个修饰符时，需要这样定义，

```Python
class Person:
    name = String('name')
```

可以看到，我们不得不输入两次 `name` 以便实例化修饰符时，告诉修饰符被修饰属性的名字。而为了省略修饰符实例化时的参数通常做法是定义一个 metaclass 或者让修饰符生成一个唯一值取代 name 添加到 `__dict__` 中，两种做法前者会觉得为了实现一个这样的方法而实用元编程会显得累赘，后者由于 `__dict__` 中的托管属性是程序生成的，有些时候会使程序难以调试。

在 Python 3.6 之后，我们可以用以下方式重新定义这个修饰符，

```Python
class String:
    def __set_name__(self, owner, name):
        self.name = name

    def __get__(self, instance, cls): 
        if instance is None:
            return self
        return instance.__dict__[self.name]

    def __set__(self, instance, value): 
        if not isinstance(value, str):
            raise TypeError('Expected a string') 
        instance.__dict__[self.name] = value
```

这样，在修饰符实例化的时候，我们的被修饰属性的名字会自动告知修饰符，上述的 `Person` 类我们只需要这样定义。

```Python
class Person:
    name = String()
```

*附注*：

在 [Descriptor HowTo Guide](https://docs.python.org/3/howto/descriptor.html) 中，Hettinger提到，

> Descriptors are a powerful, general purpose protocol. They are the mechanism behind properties, methods, static methods, class methods, and super(). 

还记得在 Python 2 中，我们使用 `super()` 时应该写成 `super(cls, self)` 么？有点异曲同工之妙。Guido在 [Unifying types and classes in Python 2.2](https://www.python.org/download/releases/2.2.3/descrintro/#cooperation) 中给出了一个纯Python实现的Python 2 版本的 `super()`。

## 第二个知识点 —— `_NOT_FOUND = object()`

这个用法在《Python Cookbook》中有类似的用法，当我们想检查一个值是否是有效值，并且我们又无法得知这个值的类型和可能范围，我们是不能用 `if not x` 或者 `if x is not None` 来判断的，前者会导致 `None`、 `[]`、 `0`等全部会判定失败，后者实际上，有时None也是有效值。在这种情况下，我们应该可以利用object()创建一个独特的私有实例，就像 `functools.cached_property` 中使用的 `_NOT_FOUND`。在判断中，可以用这个特殊值来做相等性检测，以此判断值的有效值。这里主要考虑到对于大多程序来说，把 `_NOT_FOUND` 实例作为属性值几乎是不可能的。因此，`_NOT_FOUND` 就成了一个可以用来安全比较的值。

## 第三个知识点 —— `cache[self.attrname] = val`

此处的 `cache` 是 `instance.__dict__` 的引用。

通常我们对 `instance.__dict__` 的理解是此实例中的所有的属性名和对应值。而这一行代码会将一个与修饰符所修饰的属性名相同的的属性加入到实例的 `__dict__` 属性中。这里就会产生一个疑问，`__dict__` 中的属性名和修饰符是否会产生冲突。

当我们使用 `instance.attr` 时，实际的效果和 `getattr(instance, attr_name)` 是一样的，而 `getattr` 首先使用了 `object.__getattribute__` 来查看实例中是否有相应属性，当其抛出 `AttributeError` 时，才会调用 `object.__getattr__` 方法获取属性值。也就是说，`__getattribute__` 控制了查找属性的行为，而 `__getattr__` 是对不存在的属性的补救方法。具体参见N Randhawa在 [Difference between `__getattr__` vs `__getattribute__`](https://stackoverflow.com/a/38788326) 中的回答。

`__getattribute__` 方法会按照下面的顺序查找属性，

1. 通过 `type(instance).__dict__[attr_name].__get__(instance, type(instance))` 尝试获取数据型修饰符（实现了 `__get__` 方法的修饰符）的结果。
2. 通过 `instance.__dict__[attr_name]` 尝试获取实例属性。
3. 尝试获取修饰符（没有实现 `__get__` 方法的修饰符）的实例。
4. 抛出 `AttributeError` 并调用 `__getattr__`。

也就是说，即使在描述符的中覆盖了 `instance.__dict__[attr_name]` 的值，也不会影响一个数据型描述符的功能。

而当我们使用 `instance.attr = value` 时，实际的效果和 `setattr(instance, attr_name, value)` 是一样的，它实际上是使用了 `object.__setattr__` 的魔术方法。

`__setattr__` 方法会按照下面的顺序对实例属性赋值，

1. 通过 `type(instance).__dict__[attr_name].__set__(instance, type(instance), value)` 尝试使用修饰符的 `__set__` 方法。
2. 通过 `instance.__dict__[attr_name] = value` 为实例属性赋值。

所以 `setattr` 和 `getattr` 虽然从名称上来看，他们是对等的，但是实际上他们的逻辑并不完全一样。

另外，值得关注的是修饰符实例托管在实例所属类的 `__dict__` 属性中，也就是 `type(instance).__dict__` 中，如果使用 `type(instance).attr = value` 修改了类属性，那么修饰符和其功能也会随之消失。

## 附录：其他实现的代码

### django.utils.functional.cached_property

```Python
class cached_property:
    """
    Decorator that converts a method with a single self argument into a
    property cached on the instance.
    A cached property can be made out of an existing method:
    (e.g. ``url = cached_property(get_absolute_url)``).
    The optional ``name`` argument is obsolete as of Python 3.6 and will be
    deprecated in Django 4.0 (#30127).
    """
    name = None

    @staticmethod
    def func(instance):
        raise TypeError(
            'Cannot use cached_property instance without calling '
            '__set_name__() on it.'
        )

    def __init__(self, func, name=None):
        self.real_func = func
        self.__doc__ = getattr(func, '__doc__')

    def __set_name__(self, owner, name):
        if self.name is None:
            self.name = name
            self.func = self.real_func
        elif name != self.name:
            raise TypeError(
                "Cannot assign the same cached_property to two different names "
                "(%r and %r)." % (self.name, name)
            )

    def __get__(self, instance, cls=None):
        """
        Call the function and put the return value in instance.__dict__ so that
        subsequent attribute access on the instance returns the cached value
        instead of calling cached_property.__get__().
        """
        if instance is None:
            return self
        res = instance.__dict__[self.name] = self.func(instance)
        return res
```

### werkzeug.utils.cached_property

```Python
class cached_property(property):

    """A decorator that converts a function into a lazy property.  The
    function wrapped is called the first time to retrieve the result
    and then that calculated result is used the next time you access
    the value::

        class Foo(object):

            @cached_property
            def foo(self):
                # calculate something important here
                return 42

    The class has to have a `__dict__` in order for this property to
    work.
    """

    # implementation detail: A subclass of python's builtin property
    # decorator, we override __get__ to check for a cached value. If one
    # choses to invoke __get__ by hand the property will still work as
    # expected because the lookup logic is replicated in __get__ for
    # manual invocation.

    def __init__(self, func, name=None, doc=None):
        self.__name__ = name or func.__name__
        self.__module__ = func.__module__
        self.__doc__ = doc or func.__doc__
        self.func = func


    def __set__(self, obj, value):
        obj.__dict__[self.__name__] = value

    def __get__(self, obj, type=None):
        if obj is None:
            return self
        value = obj.__dict__.get(self.__name__, _missing)
        if value is _missing:
            value = self.func(obj)
            obj.__dict__[self.__name__] = value
        return value
```    


Reference：

Guido van Rossum. [Unifying types and classes in Python 2.2](https://www.python.org/download/releases/2.2.3/descrintro/#cooperation).

Luciano Ramalho. 2015. Fluent Python (1st. ed.). O’Reilly Media, Inc.

Raymond Hettinger. [Descriptor HowTo Guide](https://docs.python.org/3/howto/descriptor.html).

Difference between `__getattr__` vs `__getattribute__`. StackOverflow. [🔗Link](https://stackoverflow.com/a/38788326)