# Fibonacci Series is a mathematical series that a number is the sum of
# previous two numbers before it


def fibonacci(end=None, start=0, inclusive=True, length=None):
    """This function returns a Fibonacci series list:
        - either upto an end number
        - or with a length argument which defines the length of the list
    start number is default to 0 and optinal to change for both.
    All items in the returning list is integer.
    """
    if not end and not length:
        raise Exception("""please define at least the length of the
            series with length argument OR define an end number""")
    elif end and length:
        raise Exception("""you cannot define both the length (length of
            the series) and the end arguments!""")

    fibonacci_list = []

    if not isinstance(start, (int, float)):
        raise TypeError(f'only numbers are allowed!: {start}')

    start = int(start)+1 if start > int(start) else int(start)

    if end:
        # define an end number with optional start and inclusive args.
        if not isinstance(end, (int, float)):
            raise TypeError(f'only numbers are allowed!: {end}')

        end = int(end) if inclusive else int(end)-1
        a, b = (0, 1) if start == 0 else (start, start)

        while a <= end:
            fibonacci_list.append(a)
            a, b = b, b+a

    if length:
        # define the length of the series list by using length argument
        # with optional start argument.
        if not isinstance(length, int):
            raise TypeError(f'only numbers are allowed!: {length}')

        a, b = (0, 1) if start == 0 else (start, start)

        for _ in range(length):
            fibonacci_list.append(a)
            a, b = b, b+a

    return fibonacci_list
