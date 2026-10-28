ARG PYTHON_IMAGE=python:3.13.18-alpine@sha256:bbc0290146ebe0a8b9a8ed07d3f2c7bdeb4d917fc93300a4e47490c8b5a11b48
FROM ${PYTHON_IMAGE} AS xml-source
RUN apk add --no-cache build-base autoconf automake libtool openssl bash
ADD --checksum=sha256:16afbb9cefead2aa278105cf27d9f597bde7fbf3dbb85015857ca7ca6a4e89ba https://github.com/libexpat/libexpat/releases/download/R_2_9_0/expat-2.9.0.tar.gz /tmp/expat.tar.gz
COPY expat-patches /patches
RUN cd /patches && sha256sum -c SHA256SUMS
WORKDIR /expat-source
RUN tar -xzf /tmp/expat.tar.gz --strip-components=1 -C . \
    && patch --batch --fuzz=0 -p2 < /patches/00-amplification.patch \
    && patch --batch --fuzz=0 -p2 < /patches/01-reset.patch \
    && CFLAGS="-O2 -fstack-protector-strong -U_FORTIFY_SOURCE -D_FORTIFY_SOURCE=3" \
       LDFLAGS="-Wl,-z,relro,-z,now" ./configure --prefix=/usr --disable-static --without-docbook \
    && make -j2 && make check && make DESTDIR=/expat-stage install
RUN mkdir -p /pkg/usr/lib /pkg/usr/share/doc/libexpat /out \
    && cp -a /expat-stage/usr/lib/libexpat.so.* /pkg/usr/lib/ \
    && cp COPYING /pkg/usr/share/doc/libexpat/copyright \
    && cp tests/test-suite.log /pkg/usr/share/doc/libexpat/upstream-tests.log \
    && cp -a /patches /pkg/usr/share/doc/libexpat/patches \
    && openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out /tmp/runtime.rsa \
    && openssl pkey -in /tmp/runtime.rsa -pubout -out /out/runtime-expat.rsa.pub \
    && apk mkpkg --sign-key /tmp/runtime.rsa --files /pkg --output /out/libexpat.apk \
       --info name:libexpat --info version:2.9.0_p20261023-r0 --info arch:$(apk --print-arch) \
       --info origin:expat --info license:MIT --info url:https://libexpat.github.io/ \
       --info description:'Expat XML parser with upstream backports' \
       --info depends:so:libc.musl-$(apk --print-arch).so.1 --info provides:so:libexpat.so.1=1.13.0 \
    && cp /out/runtime-expat.rsa.pub /etc/apk/keys/ && apk verify /out/libexpat.apk \
    && cc /patches/check-expat.c -I/expat-stage/usr/include -L/expat-stage/usr/lib -lexpat -o /out/check-expat \
    && LD_LIBRARY_PATH=/expat-stage/usr/lib /out/check-expat \
    && rm /tmp/runtime.rsa

FROM ${PYTHON_IMAGE} AS sqlite-source
ADD --checksum=sha256:0e9483900e92cd5de8fd48d16bf9200145a61f7fd5be542a5ac81d8a9516eb9c https://www.sqlite.org/2026/sqlite-autoconf-3530400.tar.gz /tmp/sqlite-autoconf.tar.gz
ADD --checksum=sha256:d18fa15aec74d8c17e1463f861095adc01b5ad190256acb4f91d22f0368d232b https://www.sqlite.org/2026/sqlite-src-3530400.zip /tmp/sqlite-src.zip
COPY sqlite-runtime /sqlite-runtime
RUN sh /sqlite-runtime/build.sh

FROM ${PYTHON_IMAGE} AS python-source
# Match the official image's same-version interpreter configuration and runtime ABI.
RUN apk add --no-cache bluez-dev bzip2-dev dpkg-dev dpkg findutils g++ gcc \
    gdbm-dev libc-dev libffi-dev libnsl-dev libtirpc-dev linux-headers make \
    ncurses-dev openssl-dev pax-utils readline-dev sqlite-dev tar tcl-dev tk tk-dev \
    util-linux-dev xz xz-dev zlib-dev
COPY --from=xml-source /expat-stage/ /expat-stage/
ADD --checksum=sha256:abb0102e6d4ae027509bcb82327d9dd85515b44a3ba8ad538cfc5e9847029f68 https://www.python.org/ftp/python/3.13.18/Python-3.13.18.tar.xz /tmp/python.tar.xz
ADD --checksum=sha256:fd7f4dfa8190e014013b9f08f3e973f4e4c26ffd179a204895533a7254813a70 https://files.pythonhosted.org/packages/3f/06/3e4420302363fbb71be3c7f35ce042f54bfca330e3e66b3a2e3c4cca579f/pip-26.2.2-py3-none-any.whl /bootstrap/pip-26.2.2-py3-none-any.whl
ADD --checksum=sha256:0cf3cae568d36aa9576b28dfb35f11328f1cb974ca7647d9475ebb86c75ac6e3 https://files.pythonhosted.org/packages/92/9d/c4e665119135114480843e7ab388fa94d8480650450e6f8e26b70d323a4c/urllib3-2.8.0-py3-none-any.whl /bootstrap/urllib3-2.8.0-py3-none-any.whl
ADD --checksum=sha256:04c721c2c7448767e9e3f2520a475663d8ee0f09c31890f6d2bd70fd636a9647 https://files.pythonhosted.org/packages/31/f9/c0a1c127f9049db9155afc316952ea571720dd01833ff5e4d7e8e6352dbb/msgpack-1.2.1.tar.gz /bootstrap/msgpack-1.2.1.tar.gz
COPY python-bootstrap /python-bootstrap
RUN python /python-bootstrap/patch-pip-wheel.py /bootstrap/pip-26.2.2-py3-none-any.whl /bootstrap/urllib3-2.8.0-py3-none-any.whl /bootstrap/msgpack-1.2.1.tar.gz /bootstrap/patched/pip-26.2.2-py3-none-any.whl \
    && printf '%s  %s\n' 3b0620d6061cdd040e834a681cd3bfc34f8196dfb6e9a743d15c77ed4fda2d90 /bootstrap/patched/pip-26.2.2-py3-none-any.whl | sha256sum -c
ENV LD_LIBRARY_PATH=/expat-stage/usr/lib
WORKDIR /python-source
RUN tar -xJf /tmp/python.tar.xz --strip-components=1 -C . \
    && python /python-bootstrap/refresh-bootstrap.py /python-source \
    && gnuArch="$(dpkg-architecture --query DEB_BUILD_GNU_TYPE)" \
    && CPPFLAGS="-I/expat-stage/usr/include" LDFLAGS="-L/expat-stage/usr/lib -Wl,-z,relro,-z,now -Wl,--strip-all" \
       ./configure --build="$gnuArch" --prefix=/usr/local \
       --enable-loadable-sqlite-extensions --enable-option-checking=fatal --enable-shared \
       --with-lto --with-ensurepip --with-system-expat \
    && make -j2 EXTRA_CFLAGS="-DTHREAD_STACK_SIZE=0x100000 -fno-omit-frame-pointer -mno-omit-leaf-frame-pointer" \
    && LD_LIBRARY_PATH=/python-source:/expat-stage/usr/lib ./python -m test -j2 \
       test_pyexpat test_xml_etree test_xml_etree_c test_minidom test_sax \
    && rm python \
    && make -j2 LDFLAGS="-L/expat-stage/usr/lib -Wl,-z,relro,-z,now -Wl,--strip-all -Wl,-rpath='\$\$ORIGIN/../lib'" python \
    && make DESTDIR=/python-stage install \
    && find /python-stage/usr/local -depth \
       \( \( -type d -a \( -name test -o -name tests -o -name idle_test \) \) \
       -o \( -type f -a \( -name '*.pyc' -o -name '*.pyo' -o -name 'libpython*.a' \) \) \) -exec rm -rf '{}' + \
    && module=$(find /python-stage/usr/local/lib/python3.13/lib-dynload -name 'pyexpat.*.so') \
    && test -n "$module" && scanelf --needed --nobanner "$module" | grep 'libexpat.so.1' \
    && nm -D "$module" | grep ' U XML_SetHashSalt16Bytes' \
    && mkdir -p /python-stage/usr/local/share \
    && printf '%s\n' '{"python":"3.13.18","source":"https://www.python.org/ftp/python/3.13.18/Python-3.13.18.tar.xz","sha256":"abb0102e6d4ae027509bcb82327d9dd85515b44a3ba8ad538cfc5e9847029f68","configuration":"Official Alpine shared interpreter configuration plus --with-system-expat","expat":"2.9.0_p20261023-r0"}' > /python-stage/usr/local/share/python-runtime.json


# Resolve shared-library providers for every rebuilt extension, excluding the prefix's own libraries.
RUN find /python-stage/usr/local -type f -exec scanelf --needed --nobanner --format '%n#p' '{}' ';' \
    | tr ',' '\n' | sort -u \
    | awk 'NF == 0 { next } system("[ -e /python-stage/usr/local/lib/" $1 " ]") == 0 { next } { print "so:" $1 }' \
    > /python-runtime-deps

FROM ${PYTHON_IMAGE}
COPY --from=xml-source /out/runtime-expat.rsa.pub /etc/apk/keys/runtime-expat.rsa.pub
COPY --from=xml-source /out/libexpat.apk /out/check-expat /tmp/
RUN apk verify /tmp/libexpat.apk && apk add --no-cache /tmp/libexpat.apk \
    && /tmp/check-expat && apk list --installed libexpat | grep -q '^libexpat-2.9.0_p20261023-r0 ' \
    && cd /usr/share/doc/libexpat/patches && sha256sum -c SHA256SUMS \
    && rm /tmp/libexpat.apk /tmp/check-expat
# Remove obsolete bootstrap wheel filenames before overlaying the same-version stdlib.
RUN rm -rf /usr/local/lib/python3.13/ensurepip/_bundled
COPY --from=python-source /python-stage/usr/local/ /usr/local/
RUN --mount=from=python-source,source=/python-runtime-deps,target=/tmp/python-runtime-deps \
    apk add --no-cache $(cat /tmp/python-runtime-deps) \
    && apk list --installed libexpat | grep -q '^libexpat-2.9.0_p20261023-r0 '
COPY --from=sqlite-source /out/runtime-sqlite.rsa.pub /etc/apk/keys/runtime-sqlite.rsa.pub
RUN --mount=from=sqlite-source,source=/out,target=/tmp/sqlite-check,readonly \
    apk verify /tmp/sqlite-check/sqlite-libs.apk \
    && apk add --no-cache /tmp/sqlite-check/sqlite-libs.apk \
    && python /tmp/sqlite-check/verify-sqlite.py
RUN --mount=from=python-source,source=/bootstrap/patched/pip-26.2.2-py3-none-any.whl,target=/tmp/pip-26.2.2-py3-none-any.whl \
    --mount=from=python-source,source=/python-bootstrap/check-pip-vendors.py,target=/tmp/check-pip-vendors.py \
    python -m pip install --no-index --no-deps --force-reinstall /tmp/pip-26.2.2-py3-none-any.whl \
    && python /tmp/check-pip-vendors.py \
    && python -m venv /tmp/bootstrap-venv \
    && /tmp/bootstrap-venv/bin/python /tmp/check-pip-vendors.py \
    && rm -rf /tmp/bootstrap-venv
RUN python -c 'import pyexpat; assert pyexpat.EXPAT_VERSION == "expat_2.9.0"'


RUN adduser -D -u 1000 -G users jovyan
COPY requirements.txt requirements.lock.txt /tmp/notebook-environment/
RUN pip install --no-cache-dir --require-hashes -r /tmp/notebook-environment/requirements.lock.txt

RUN --mount=from=sqlite-source,source=/out,target=/tmp/sqlite-check,readonly \
    python /tmp/sqlite-check/verify-sqlite.py

WORKDIR /home/jovyan
RUN mkdir -p /home/jovyan/data && chown jovyan:users /home/jovyan/data
COPY --chown=1000:100 ./data /home/jovyan/data
USER 1000:100
EXPOSE 8888
CMD ["jupyter", "lab", "--ip=0.0.0.0", "--port=8888", "--no-browser"]
