FROM python:3.13.18-alpine@sha256:bbc0290146ebe0a8b9a8ed07d3f2c7bdeb4d917fc93300a4e47490c8b5a11b48
RUN apk upgrade --no-cache

RUN adduser -D -u 1000 -G users jovyan
COPY requirements.txt requirements.lock.txt /tmp/notebook-environment/
RUN pip install --no-cache-dir --require-hashes -r /tmp/notebook-environment/requirements.lock.txt

WORKDIR /home/jovyan
RUN mkdir -p /home/jovyan/data && chown jovyan:users /home/jovyan/data
COPY --chown=1000:100 ./data /home/jovyan/data
USER 1000:100
EXPOSE 8888
CMD ["jupyter", "lab", "--ip=0.0.0.0", "--port=8888", "--no-browser"]
